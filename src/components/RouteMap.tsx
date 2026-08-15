import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { meterConnectColors as c } from "../theme/meterConnectColors";
import { LEAFLET_CSS, LEAFLET_JS } from "./leafletDist";

export type ReadingStatus = "pending" | "completed";

export interface ReadingLocation {
  id: string | number;
  latitude: number;
  longitude: number;
  address: string;
  status: ReadingStatus;
}

interface Props {
  readings: ReadingLocation[];
  onPressDetails?: (id: string | number) => void;
}

type WebViewMessage =
  | { type: "ready" }
  | { type: "pressDetails"; id: string | number };

// Static HTML, built once — it never depends on `readings`. Data flows in
// via injectJavaScript(window.__setReadings(...)) after the page reports
// itself ready, so re-renders don't reload the page or reset pan/zoom.
// The STATUS_COLOR/STATUS_LABEL constants below run inside the WebView's own
// JS context (it can't import this module) — keep them in sync by hand with
// ReadingStatus's meaning elsewhere in the app.
// Leaflet's JS/CSS are vendored inline (leafletDist.ts) rather than loaded
// from a CDN — otherwise a first-ever launch with no connection would never
// even initialize the map engine, let alone render markers offline.
const MAP_HTML =
  `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>` +
  LEAFLET_CSS +
  `</style>
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #e2e8f0; }
  .visit-dot {
    width: 20px; height: 20px; border-radius: 10px; border: 2px solid #ffffff;
    box-shadow: 0 1px 2px rgba(0,0,0,0.35);
  }
  .cluster-badge {
    display: flex; align-items: center; justify-content: center;
    border-radius: 999px; border: 2px solid #ffffff; color: #ffffff;
    font-weight: 700; font-family: -apple-system, Roboto, sans-serif;
    box-shadow: 0 1px 3px rgba(0,0,0,0.35);
  }
  .user-location-dot {
    width: 16px; height: 16px; border-radius: 8px; background: #2563eb;
    border: 3px solid #ffffff; box-shadow: 0 0 0 4px rgba(37,99,235,0.25);
  }
  .leaflet-popup-content { min-width: 160px; max-width: 240px; margin: 10px 12px; }
  .popup-address { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
  .popup-status-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  .popup-status-dot { width: 8px; height: 8px; border-radius: 4px; }
  .popup-status-text { font-size: 12px; font-weight: 600; color: #475569; }
  .popup-details-row {
    display: flex; align-items: center; justify-content: space-between;
    border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 4px; cursor: pointer;
  }
  .popup-details-text { font-size: 12px; font-weight: 700; color: #006591; }
  .leaflet-control-attribution {
    font-size: 9px; padding: 0 4px; background: rgba(255,255,255,0.7);
  }
</style>
</head>
<body>
<div id="map"></div>
<script>` +
  LEAFLET_JS +
  `</script>
<script>
(function () {
  var STATUS_COLOR = { pending: "#f59e0b", completed: "#10b981" };
  var STATUS_LABEL = { pending: "Pendente", completed: "Concluído" };
  var FALLBACK_CENTER = [-3.7319, -38.5267];
  // Same formula the previous react-native-map-clustering setup used
  // (screenWidth * 0.06) — clamped so very narrow/very wide containers
  // don't push it to an unreasonable extreme. 48px flat was too generous
  // and merged points that weren't actually close together.
  var CLUSTER_RADIUS_PX = Math.max(22, Math.min(40, window.innerWidth * 0.06));
  var EDGE_PADDING = [60, 60];

  // No zoom +/- buttons (pinch/double-tap zoom still work). Attribution
  // stays — OSM's and CARTO's usage policies require it — but is trimmed to
  // just the required copyright text, no "Leaflet" branding.
  var map = L.map("map", { zoomControl: false, attributionControl: false }).setView(
    FALLBACK_CENTER,
    13
  );
  L.control.attribution({ prefix: false }).addTo(map);

  // CARTO Voyager: same OSM data, a cleaner/more modern raster style, free
  // and keyless — still a plain <img> tile layer, so it's a drop-in swap.
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    {
      subdomains: "abcd",
      maxZoom: 20,
      detectRetina: true,
      attribution: "&copy; OSM &copy; CARTO",
    }
  ).addTo(map);

  var layerGroup = L.layerGroup().addTo(map);
  var readings = [];
  var hasFitOnce = false;

  function post(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }

  function clusterBadgeSize(count) {
    if (count >= 25) return 56;
    if (count >= 10) return 50;
    if (count >= 4) return 44;
    return 38;
  }

  function buildPopupContent(reading) {
    var container = document.createElement("div");

    var address = document.createElement("div");
    address.className = "popup-address";
    address.textContent = reading.address;
    container.appendChild(address);

    var statusRow = document.createElement("div");
    statusRow.className = "popup-status-row";
    var dot = document.createElement("span");
    dot.className = "popup-status-dot";
    dot.style.backgroundColor = STATUS_COLOR[reading.status];
    var statusText = document.createElement("span");
    statusText.className = "popup-status-text";
    statusText.textContent = STATUS_LABEL[reading.status];
    statusRow.appendChild(dot);
    statusRow.appendChild(statusText);
    container.appendChild(statusRow);

    var detailsRow = document.createElement("div");
    detailsRow.className = "popup-details-row";
    var detailsText = document.createElement("span");
    detailsText.className = "popup-details-text";
    detailsText.textContent = "Ver detalhes";
    var chevron = document.createElement("span");
    chevron.className = "popup-details-text";
    chevron.textContent = "\\u203A";
    detailsRow.appendChild(detailsText);
    detailsRow.appendChild(chevron);
    detailsRow.addEventListener("click", function () {
      post({ type: "pressDetails", id: reading.id });
    });
    container.appendChild(detailsRow);

    return container;
  }

  function markerIcon(reading) {
    return L.divIcon({
      className: "",
      html:
        '<div class="visit-dot" style="background:' +
        STATUS_COLOR[reading.status] +
        '"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    });
  }

  function badgeHtml(size, color, fontSize, label) {
    return (
      '<div class="cluster-badge" style="width:' +
      size +
      "px;height:" +
      size +
      "px;background:" +
      color +
      ";font-size:" +
      fontSize +
      'px">' +
      label +
      "</div>"
    );
  }

  // A cluster with only one status keeps a single colored badge with the
  // total. A mixed cluster shows two badges side by side — one orange with
  // the pending count, one green with the completed count — instead of
  // collapsing both into a single number under whichever color "wins"
  // (which used to make an all-green cluster with one pending visit look
  // like it was entirely pending).
  function clusterIcon(pendingCount, completedCount) {
    var total = pendingCount + completedCount;

    if (pendingCount === 0 || completedCount === 0) {
      var color = pendingCount > 0 ? STATUS_COLOR.pending : STATUS_COLOR.completed;
      var size = clusterBadgeSize(total);
      return L.divIcon({
        className: "",
        html: badgeHtml(size, color, size >= 50 ? 15 : 13, total),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    }

    var badgeSize = clusterBadgeSize(Math.max(pendingCount, completedCount));
    var fontSize = badgeSize >= 50 ? 15 : 13;
    var overlap = Math.round(badgeSize * 0.2);
    var width = badgeSize * 2 - overlap;
    var html =
      '<div style="position:relative;width:' + width + "px;height:" + badgeSize + 'px">' +
      '<div style="position:absolute;left:0;top:0">' +
      badgeHtml(badgeSize, STATUS_COLOR.pending, fontSize, pendingCount) +
      "</div>" +
      '<div style="position:absolute;right:0;top:0">' +
      badgeHtml(badgeSize, STATUS_COLOR.completed, fontSize, completedCount) +
      "</div>" +
      "</div>";
    return L.divIcon({
      className: "",
      html: html,
      iconSize: [width, badgeSize],
      iconAnchor: [width / 2, badgeSize / 2],
    });
  }

  // Centroid-based proximity grouping in screen-pixel space, recomputed on
  // every zoom/pan — mirrors the previous supercluster-based aggregation
  // (visits in the same region collapse into one badge showing the total
  // count). A point joins the nearest existing cluster only if it's within
  // radius of that cluster's *current center* — not just of some other
  // member. Pure single-linkage (join if close to ANY member) chains: A-B
  // close and B-C close would merge A and C even if they're far apart,
  // growing a cluster's real footprint well past the radius. That both
  // undercounts (a chained-away outlier can end up split into its own
  // singleton) and looks wrong (the badge sits at the centroid, but the
  // route line still runs between each point's real coordinate, so it
  // visibly sticks out past a badge that's supposed to be covering it).
  // Centroid distance keeps clusters bounded to roughly one radius wide.
  function computeClusters() {
    if (!readings.length) return [];
    var clusters = [];
    readings.forEach(function (reading) {
      var pt = map.latLngToContainerPoint([reading.latitude, reading.longitude]);
      var best = null;
      var bestDist = Infinity;
      for (var i = 0; i < clusters.length; i++) {
        var dx = clusters[i].centerX - pt.x;
        var dy = clusters[i].centerY - pt.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= CLUSTER_RADIUS_PX && dist < bestDist) {
          best = clusters[i];
          bestDist = dist;
        }
      }
      if (best) {
        best.members.push(reading);
        best.sumX += pt.x;
        best.sumY += pt.y;
        best.centerX = best.sumX / best.members.length;
        best.centerY = best.sumY / best.members.length;
      } else {
        clusters.push({ centerX: pt.x, centerY: pt.y, sumX: pt.x, sumY: pt.y, members: [reading] });
      }
    });
    return clusters.map(function (c) { return c.members; });
  }

  var markersById = {};

  // Centers the map on a reading, then reopens its popup once the pan
  // settles. render() (bound to "moveend" right after map creation, so it
  // always runs before this once-listener) rebuilds every marker on that
  // same event — reopening here, after the rebuild, is what makes the
  // popup actually stick instead of flashing.
  function centerAndOpenPopup(reading) {
    var zoom = map.getZoom();
    var targetPoint = map.project([reading.latitude, reading.longitude], zoom);
    // The popup opens above the marker. If the marker sits at the dead
    // center of a short container, the popup's own height pushes past the
    // top edge (autoPan is off, so nothing corrects for that). Instead of
    // centering on the marker, center on a point above it in screen space —
    // that puts the marker in the lower half of the view, leaving headroom
    // for the popup.
    var verticalOffset = Math.max(40, Math.min(120, map.getSize().y / 2 - 20));
    var viewLatLng = map.unproject(targetPoint.subtract([0, verticalOffset]), zoom);

    map.once("moveend", function () {
      var marker = markersById[reading.id];
      if (marker) marker.openPopup();
    });
    map.setView(viewLatLng, zoom, { animate: true });
  }

  function render() {
    layerGroup.clearLayers();
    markersById = {};

    // Route lines always follow the raw, un-clustered sequence and take the
    // color of the destination point's status — same rule as before.
    for (var i = 1; i < readings.length; i++) {
      var prev = readings[i - 1];
      var curr = readings[i];
      L.polyline(
        [
          [prev.latitude, prev.longitude],
          [curr.latitude, curr.longitude],
        ],
        { color: STATUS_COLOR[curr.status], weight: 4 }
      ).addTo(layerGroup);
    }

    computeClusters().forEach(function (group) {
      var lat = group.reduce(function (s, r) { return s + r.latitude; }, 0) / group.length;
      var lng = group.reduce(function (s, r) { return s + r.longitude; }, 0) / group.length;

      if (group.length === 1) {
        var reading = group[0];
        var marker = L.marker([lat, lng], { icon: markerIcon(reading) })
          .addTo(layerGroup)
          // autoPan is off on purpose: panning to fit the popup fires a
          // moveend, which triggers render() and rebuilds every marker —
          // including the one whose popup just opened. centerAndOpenPopup
          // (below) drives the recenter explicitly and reopens the popup
          // itself once that rebuild is done, avoiding the flash.
          .bindPopup(buildPopupContent(reading), { autoPan: false })
          .on("click", function () {
            centerAndOpenPopup(reading);
          });
        markersById[reading.id] = marker;
        return;
      }

      var pendingCount = group.filter(function (r) { return r.status === "pending"; }).length;
      var completedCount = group.length - pendingCount;
      var bounds = L.latLngBounds(
        group.map(function (r) { return [r.latitude, r.longitude]; })
      );

      L.marker([lat, lng], {
        icon: clusterIcon(pendingCount, completedCount),
      })
        .addTo(layerGroup)
        .on("click", function () {
          map.fitBounds(bounds, { padding: EDGE_PADDING, animate: true, maxZoom: 18 });
        });
    });
  }

  function fitToReadings(animate) {
    if (readings.length > 1) {
      var bounds = L.latLngBounds(
        readings.map(function (r) { return [r.latitude, r.longitude]; })
      );
      map.fitBounds(bounds, { padding: EDGE_PADDING, animate: animate });
    } else if (readings.length === 1) {
      map.setView([readings[0].latitude, readings[0].longitude], 16, { animate: animate });
    } else {
      map.setView(FALLBACK_CENTER, 13, { animate: animate });
    }
  }

  var lastGeoSignature = null;

  function geoSignature(list) {
    return list
      .map(function (r) { return r.id + ":" + r.latitude + "," + r.longitude; })
      .join("|");
  }

  window.__setReadings = function (next) {
    readings = next || [];
    render();

    // Re-fit bounds only when the actual set of coordinates changes (e.g.
    // route just loaded, or a point count changed) — not on every call,
    // otherwise an unrelated re-render (or just marking a visit as
    // completed, which only changes a marker's color) would reset whatever
    // pan/zoom the user is mid-gesture on.
    var signature = geoSignature(readings);
    if (signature !== lastGeoSignature) {
      fitToReadings(hasFitOnce);
      hasFitOnce = true;
      lastGeoSignature = signature;
    }
  };

  // Triggered from the "center visits" button in RN — always re-fits,
  // regardless of the signature guard above, since this is an explicit
  // user request rather than an incidental data refresh.
  window.__fitAll = function () {
    fitToReadings(true);
  };

  map.on("zoomend moveend", render);
  window.addEventListener("resize", function () { map.invalidateSize(); });

  // Mirrors the previous showsUserLocation marker; best-effort, ignored if
  // geolocation is unavailable or permission is denied.
  if (navigator.geolocation) {
    var userMarker = null;
    navigator.geolocation.watchPosition(
      function (pos) {
        var latlng = [pos.coords.latitude, pos.coords.longitude];
        if (!userMarker) {
          userMarker = L.marker(latlng, {
            icon: L.divIcon({
              className: "",
              html: '<div class="user-location-dot"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            }),
            zIndexOffset: 1000,
          }).addTo(map);
        } else {
          userMarker.setLatLng(latlng);
        }
      },
      function () {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }

  post({ type: "ready" });
})();
</script>
</body>
</html>`;

export function RouteMap({ readings, onPressDetails }: Props) {
  const webviewRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const onPressDetailsRef = useRef(onPressDetails);
  onPressDetailsRef.current = onPressDetails;

  const pushReadings = () => {
    if (!readyRef.current || !webviewRef.current) return;
    const payload = JSON.stringify(readings).replace(
      /[\u2028\u2029]/g,
      (char) => (char === "\u2028" ? "\\u2028" : "\\u2029"),
    );
    webviewRef.current.injectJavaScript(
      `window.__setReadings(${payload}); true;`,
    );
  };

  useEffect(() => {
    pushReadings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings]);

  const handleMessage = (event: WebViewMessageEvent) => {
    let data: WebViewMessage;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    if (data.type === "ready") {
      readyRef.current = true;
      pushReadings();
    } else if (data.type === "pressDetails") {
      onPressDetailsRef.current?.(data.id);
    }
  };

  const handleFitAll = () => {
    if (!readyRef.current || !webviewRef.current) return;
    webviewRef.current.injectJavaScript("window.__fitAll(); true;");
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ html: MAP_HTML }}
        style={styles.map}
        originWhitelist={["*"]}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        mixedContentMode="always"
      />
      <Pressable
        style={({ pressed }) => [
          styles.fitAllButton,
          pressed && styles.fitAllButtonPressed,
        ]}
        onPress={handleFitAll}
        hitSlop={8}
      >
        <MaterialIcons
          name="filter-center-focus"
          size={22}
          color={c.secondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#e2e8f0",
  },
  fitAllButton: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  fitAllButtonPressed: {
    opacity: 0.7,
  },
});
