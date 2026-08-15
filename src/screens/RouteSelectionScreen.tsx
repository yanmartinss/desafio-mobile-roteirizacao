import { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
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
import { OfflineEmptyState } from "../components/OfflineEmptyState";
import {
  computeRouteProgress,
  RouteSelectionCard,
} from "../components/RouteSelectionCard";
import { BottomNavBar } from "../components/BottomNavBar";
import { meterConnectColors as c } from "../theme/meterConnectColors";

type Props = NativeStackScreenProps<RootStackParamList, "RouteSelection">;

const OFFLINE_RED = "#E11D48";

export function RouteSelectionScreen({ navigation }: Props) {
  const { route, loading, error, offlineNoCache, loadRoute } = useRouteStore();
  const { visits, loadVisits } = useVisitStore();
  const isOnline = useNetworkStatus();

  useEffect(() => {
    loadRoute();
    loadVisits();
  }, []);

  const pendingSync = visits.filter(
    (v) => v.syncStatus === "pending" || v.syncStatus === "error",
  ).length;

  // Single-route data model today — this still maps over a real array so it
  // scales the moment the app loads more than one route.
  const routes = useMemo(() => (route ? [route] : []), [route]);

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

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Text style={styles.headerBrandTitle}>Desafio Mobile</Text>
        <Text style={styles.headerBrandSubtitle}>Roteirização e Leitura</Text>
      </SafeAreaView>

      {!isOnline ? (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="wifi-off" size={20} color="#ffffff" />
          <Text style={styles.offlineBannerText}>
            Modo Offline - Armazenamento local continua ativo
          </Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.list}>
          {routes.length === 0 ? (
            <Text style={styles.mutedText}>Nenhuma rota carregada.</Text>
          ) : (
            routes.map((r) => (
              <RouteSelectionCard
                key={r.routeId}
                route={r}
                progress={computeRouteProgress(r, visits)}
                onOpen={() => navigation.navigate("RouteList")}
              />
            ))
          )}
        </View>
      </ScrollView>

      <BottomNavBar
        pendingSync={pendingSync}
        onPressSync={() => navigation.navigate("Sync")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.screenBackground,
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 10,
  },
  headerBrandTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: c.onSurface,
  },
  headerBrandSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: c.onSurfaceVariant,
  },
  offlineBanner: {
    backgroundColor: OFFLINE_RED,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
    color: "#ffffff",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  list: {
    gap: 16,
  },
});
