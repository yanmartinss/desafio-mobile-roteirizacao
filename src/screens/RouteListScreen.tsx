import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useRouteStore } from "../store/routeStore";
import { useVisitStore } from "../store/visitStore";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { ReadingLocation, RouteMap } from "../components/RouteMap";
import { OfflineEmptyState } from "../components/OfflineEmptyState";
import { RoutePoint, Visit } from "../types";
import { meterConnectColors as c } from "../theme/meterConnectColors";

type Props = NativeStackScreenProps<RootStackParamList, "RouteList">;

export function RouteListScreen({ navigation }: Props) {
  const { route, loading, error, offlineNoCache, loadRoute } = useRouteStore();
  const { visits, loadVisits } = useVisitStore();
  const isOnline = useNetworkStatus();
  const wasOffline = useRef(false);
  // The map lives inside the list's header, so a drag on it competes with
  // the list's own vertical scroll. Disable list scrolling while a touch is
  // active over the map so the WebView/Leaflet pan gets the gesture instead.
  const [listScrollEnabled, setListScrollEnabled] = useState(true);

  useEffect(() => {
    loadRoute();
    loadVisits();
  }, []);

  useEffect(() => {
    const pendingVisits = visits.filter(
      (v) => v.syncStatus === "pending" || v.syncStatus === "error",
    );
    if (wasOffline.current && isOnline && pendingVisits.length > 0) {
      const pendingIds = new Set(pendingVisits.map((v) => v.pointId));
      useVisitStore
        .getState()
        .syncAll()
        .then(() => {
          const syncedCount = useVisitStore
            .getState()
            .visits.filter(
              (v) => pendingIds.has(v.pointId) && v.syncStatus === "synced",
            ).length;
          Alert.alert(
            "Conexão restabelecida",
            `${syncedCount} visita${syncedCount === 1 ? "" : "s"} sincronizada${
              syncedCount === 1 ? "" : "s"
            } automaticamente.`,
          );
        });
    }
    wasOffline.current = !isOnline;
  }, [isOnline]);

  const visitsByPoint = useMemo(() => {
    const map = new Map<number, Visit>();
    for (const v of visits) map.set(v.pointId, v);
    return map;
  }, [visits]);

  // Stable reference across unrelated re-renders (e.g. the map's own
  // scroll-lock toggle) — RouteMap treats a new array as "data changed"
  // and would otherwise reset the user's pan/zoom mid-gesture.
  const mapReadings = useMemo<ReadingLocation[]>(() => {
    if (!route) return [];
    return route.points.map((point) => ({
      id: point.id,
      latitude: point.latitude,
      longitude: point.longitude,
      address: point.address,
      status: visitsByPoint.has(point.id) ? "completed" : "pending",
    }));
  }, [route, visitsByPoint]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (offlineNoCache) {
    return (
      <View style={styles.center}>
        <OfflineEmptyState onRetry={() => loadRoute()} />
      </View>
    );
  }

  if (!route) {
    return (
      <View style={styles.center}>
        <Text style={styles.mutedText}>Nenhuma rota carregada.</Text>
      </View>
    );
  }

  const total = route.points.length;
  const visited = visits.length;
  const pending = total - visited;
  const pendingSync = visits.filter(
    (v) => v.syncStatus === "pending" || v.syncStatus === "error",
  ).length;

  const pendingLabel = `${pendingSync} pendente${pendingSync === 1 ? "" : "s"} de sincronização`;

  const banner = !isOnline
    ? {
        icon: pendingSync > 0 ? ("cloud-off" as const) : ("wifi-off" as const),
        cardBg: "#dc2626",
        cardBorder: "#dc2626",
        iconBg: "rgba(255, 255, 255, 0.2)",
        iconColor: "#ffffff",
        titleColor: "#ffffff",
        subtitleColor: "rgba(255, 255, 255, 0.85)",
        title: "Desconectado",
        subtitle: pendingSync > 0 ? pendingLabel : "Sem conexão com a internet",
        showButton: pendingSync > 0,
        buttonBg: "#ffffff",
        buttonTextColor: "#dc2626",
      }
    : {
        icon: pendingSync > 0 ? ("cloud-sync" as const) : ("wifi" as const),
        cardBg: c.success,
        cardBorder: c.success,
        iconBg: "rgba(255, 255, 255, 0.2)",
        iconColor: "#ffffff",
        titleColor: "#ffffff",
        subtitleColor: "rgba(255, 255, 255, 0.85)",
        title: "Conectado",
        subtitle: pendingSync > 0 ? pendingLabel : "Tudo sincronizado",
        showButton: pendingSync > 0,
        buttonBg: "#ffffff",
        buttonTextColor: c.success,
      };

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable
            style={({ pressed }) => [
              styles.headerBackButton,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.goBack()}
            hitSlop={8}
          >
            <MaterialIcons name="arrow-back" size={22} color={c.onSurfaceVariant} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Desafio</Text>
          </View>
        </View>
      </SafeAreaView>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        scrollEnabled={listScrollEnabled}
        data={route.points}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Pressable
              style={[
                styles.syncBanner,
                {
                  backgroundColor: banner.cardBg,
                  borderColor: banner.cardBorder,
                },
              ]}
              onPress={() => navigation.navigate("Sync")}
            >
              <View style={styles.syncBannerLeft}>
                <View
                  style={[
                    styles.syncBannerIcon,
                    { backgroundColor: banner.iconBg },
                  ]}
                >
                  <MaterialIcons
                    name={banner.icon}
                    size={20}
                    color={banner.iconColor}
                  />
                </View>
                <View style={styles.syncBannerTextWrap}>
                  <Text
                    style={[
                      styles.syncBannerTitle,
                      { color: banner.titleColor },
                    ]}
                  >
                    {banner.title}
                  </Text>
                  <Text
                    style={[
                      styles.syncBannerSubtitle,
                      { color: banner.subtitleColor },
                    ]}
                  >
                    {banner.subtitle}
                  </Text>
                </View>
              </View>
              {banner.showButton ? (
                <View
                  style={[
                    styles.syncNowButton,
                    { backgroundColor: banner.buttonBg },
                  ]}
                >
                  <MaterialIcons
                    name="sync"
                    size={18}
                    color={banner.buttonTextColor}
                  />
                  <Text
                    style={[
                      styles.syncNowButtonText,
                      { color: banner.buttonTextColor },
                    ]}
                  >
                    Sincronizar
                  </Text>
                </View>
              ) : null}
            </Pressable>

            <View style={styles.summaryGrid}>
              <SummaryCard label="Total" value={total} />
              <SummaryCard
                label="Visitados"
                value={visited}
                accentColor={c.success}
              />
              <SummaryCard
                label="Pendentes"
                value={pending}
                accentColor={c.warning}
              />
            </View>

            <View style={styles.mapSection}>
              <View style={styles.mapHeader}>
                <View style={styles.mapHeaderTitleRow}>
                  <MaterialIcons
                    name="map"
                    size={20}
                    color={c.onSurfaceVariant}
                  />
                  <Text style={styles.mapHeaderTitle} numberOfLines={1}>
                    Rota: {route.neighborhood}, {route.city} -{" "}
                    {route.state}
                  </Text>
                </View>
              </View>
              <View
                style={styles.mapImageWrap}
                onTouchStart={() => setListScrollEnabled(false)}
                onTouchEnd={() => setListScrollEnabled(true)}
                onTouchCancel={() => setListScrollEnabled(true)}
              >
                <RouteMap
                  readings={mapReadings}
                  onPressDetails={(pointId) =>
                    navigation.navigate("PointDetail", {
                      pointId: Number(pointId),
                    })
                  }
                />
              </View>
            </View>

            <View style={styles.listHeaderRow}>
              <Text style={styles.listHeaderTitle}>Pontos da rota</Text>
              <Text style={styles.listHeaderMeta}>
                {visited} de {total} concluídos
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <InspectionCard
            point={item}
            visit={visitsByPoint.get(item.id) ?? null}
            onPress={() =>
              navigation.navigate("PointDetail", { pointId: item.id })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

function SummaryCard({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: number;
  accentColor?: string;
}) {
  return (
    <View style={styles.summaryCard}>
      {accentColor ? (
        <View
          style={[styles.summaryCardAccent, { backgroundColor: accentColor }]}
        />
      ) : null}
      <Text style={styles.summaryCardLabel}>{label}</Text>
      <Text style={styles.summaryCardValue}>{value}</Text>
    </View>
  );
}

function InspectionCard({
  point,
  visit,
  onPress,
}: {
  point: RoutePoint;
  visit: Visit | null;
  onPress: () => void;
}) {
  const isCompleted = Boolean(visit);

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      <View style={[styles.cardMain, isCompleted && styles.cardMainCompleted]}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isCompleted
                ? c.completedBadgeBg
                : c.pendingBadgeBg,
            },
          ]}
        >
          <MaterialIcons
            name={isCompleted ? "check-circle" : "schedule"}
            size={14}
            color={isCompleted ? c.completedBadgeText : c.pendingBadgeText}
          />
          <Text
            style={[
              styles.badgeText,
              {
                color: isCompleted ? c.completedBadgeText : c.pendingBadgeText,
              },
            ]}
          >
            {isCompleted ? "Concluído" : "Pendente"}
          </Text>
        </View>

        <Text
          style={isCompleted ? styles.cardAddressCompleted : styles.cardAddress}
        >
          {point.customer}
        </Text>
        <View style={styles.cardSubtitleRow}>
          <MaterialIcons
            name="pin-drop"
            size={16}
            color={c.onSurfaceVariant}
            style={styles.cardSubtitleIcon}
          />
          <Text style={styles.cardSubtitle}>{point.address}</Text>
        </View>

        {isCompleted && visit ? (
          <View style={styles.completedMetaRow}>
            <Text style={styles.completedMetaLabel}>
              {visit.syncStatus === "synced"
                ? "Sincronizado"
                : "Aguardando sincronização"}
            </Text>
            <Text style={styles.completedMetaValue}>
              {new Date(visit.capturedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        ) : (
          <View style={styles.meterIdBox}>
            <Text style={styles.meterIdLabel}>Número do medidor</Text>
            <Text style={styles.meterIdValue}>{point.meterNumber}</Text>
          </View>
        )}
      </View>
      <View
        style={[styles.cardAction, isCompleted && styles.cardActionCompleted]}
      >
        <Pressable
          style={({ pressed }) => [
            isCompleted ? styles.viewDetailsButton : styles.startReadingButton,
            pressed && { opacity: 0.8 },
          ]}
          onPress={onPress}
        >
          {isCompleted ? (
            <>
              <MaterialIcons
                name="done-all"
                size={20}
                color={c.onSurfaceVariant}
              />
              <Text style={styles.viewDetailsButtonText}>Ver detalhes</Text>
            </>
          ) : (
            <>
              <Text style={styles.startReadingButtonText}>Iniciar leitura</Text>
              <MaterialIcons
                name="arrow-forward"
                size={20}
                color={c.onSecondaryContainer}
              />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.surfaceDim,
  },
  pressed: {
    opacity: 0.6,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surfaceDim,
  },
  errorText: {
    color: c.onErrorContainer,
  },
  mutedText: {
    color: c.onSurfaceVariant,
  },
  header: {
    backgroundColor: c.surfaceContainerHighest,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    color: c.onSurface,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  listHeader: {
    gap: 16,
    paddingTop: 16,
  },
  syncBanner: {
    backgroundColor: c.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  syncBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
  },
  syncBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  syncBannerTextWrap: {
    flexShrink: 1,
  },
  syncBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.onSurface,
  },
  syncBannerSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: c.onSurfaceVariant,
  },
  syncNowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: c.sync,
  },
  syncNowButtonText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "#ffffff",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: c.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  summaryCardAccent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
  },
  summaryCardLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: c.onSurfaceVariant,
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: c.onSurface,
  },
  mapSection: {
    backgroundColor: c.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    borderRadius: 12,
    overflow: "hidden",
  },
  mapHeader: {
    backgroundColor: c.surfaceBright,
    borderBottomWidth: 1,
    borderBottomColor: c.outlineVariant,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mapHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  mapHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: c.onSurface,
    flexShrink: 1,
  },
  mapImageWrap: {
    height: 192,
    width: "100%",
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  listHeaderTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    color: c.onSurface,
  },
  listHeaderMeta: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: c.onSurfaceVariant,
  },
  card: {
    backgroundColor: c.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    borderRadius: 12,
    overflow: "hidden",
  },
  cardCompleted: {
    opacity: 0.9,
  },
  cardMain: {
    backgroundColor: c.surfaceBright,
    borderBottomWidth: 1,
    borderBottomColor: c.outlineVariant,
    padding: 16,
    gap: 12,
  },
  cardMainCompleted: {
    backgroundColor: c.surfaceContainer,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  cardAddress: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
    color: c.onSurface,
  },
  cardAddressCompleted: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "700",
    color: c.onSurface,
  },
  cardSubtitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  cardSubtitleIcon: {
    marginTop: 2,
  },
  cardSubtitle: {
    flexShrink: 1,
    fontSize: 14,
    color: c.onSurfaceVariant,
  },
  meterIdBox: {
    backgroundColor: c.surfaceContainer,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  meterIdLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: c.onSurfaceVariant,
  },
  meterIdValue: {
    fontSize: 16,
    fontWeight: "700",
    color: c.onSurface,
    fontFamily: "monospace",
  },
  completedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  completedMetaLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: c.onSurfaceVariant,
  },
  completedMetaValue: {
    fontSize: 14,
    color: c.onSurfaceVariant,
  },
  cardAction: {
    backgroundColor: c.surfaceContainerLowest,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardActionCompleted: {
    backgroundColor: c.surfaceContainer,
  },
  startReadingButton: {
    width: "100%",
    height: 52,
    borderRadius: 4,
    backgroundColor: c.secondaryContainer,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  startReadingButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: c.onSecondaryContainer,
  },
  viewDetailsButton: {
    width: "100%",
    height: 52,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  viewDetailsButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: c.onSurfaceVariant,
  },
  separator: {
    height: 12,
  },
});
