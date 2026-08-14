import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useRouteStore } from "../store/routeStore";
import { useVisitStore } from "../store/visitStore";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { OfflineEmptyState } from "../components/OfflineEmptyState";
import { computeRouteProgress, RouteSelectionCard } from "../components/RouteSelectionCard";
import { Route } from "../types";
import { meterConnectColors as c } from "../theme/meterConnectColors";

type Props = NativeStackScreenProps<RootStackParamList, "RouteSelection">;

const OFFLINE_RED = "#E11D48";

function matchesSearch(route: Route, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    route.routeName.toLowerCase().includes(q) ||
    route.neighborhood.toLowerCase().includes(q) ||
    route.city.toLowerCase().includes(q)
  );
}

export function RouteSelectionScreen({ navigation }: Props) {
  const { route, loading, error, offlineNoCache, loadRoute } = useRouteStore();
  const { visits, loadVisits } = useVisitStore();
  const isOnline = useNetworkStatus();
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadRoute();
    loadVisits();
  }, []);

  const pendingSync = visits.filter(
    (v) => v.syncStatus === "pending" || v.syncStatus === "error",
  ).length;

  // Single-route data model today — this still filters/maps over a real
  // array so it scales the moment the app loads more than one route.
  const routes = useMemo(() => (route ? [route] : []), [route]);
  const visibleRoutes = useMemo(
    () => routes.filter((r) => matchesSearch(r, search)),
    [routes, search],
  );

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
        <Text style={styles.headerTitle}>Seleção de Rotas</Text>
      </SafeAreaView>

      {!isOnline ? (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="wifi-off" size={20} color="#ffffff" />
          <Text style={styles.offlineBannerText}>
            Modo Offline - Armazenamento Local Ativo
          </Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <MaterialIcons
              name="search"
              size={20}
              color={c.outline}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar Rota, Distrito ou Bairro..."
              placeholderTextColor={c.outline}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.filterButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <MaterialIcons name="tune" size={22} color={c.onSurface} />
          </Pressable>
        </View>

        <View style={styles.list}>
          {visibleRoutes.length === 0 ? (
            <Text style={styles.mutedText}>
              {routes.length === 0
                ? "Nenhuma rota carregada."
                : "Nenhuma rota encontrada para essa busca."}
            </Text>
          ) : (
            visibleRoutes.map((r) => (
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

function BottomNavBar({
  pendingSync,
  onPressSync,
}: {
  pendingSync: number;
  onPressSync: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.navTabActive}>
        <MaterialIcons name="route" size={22} color={c.onSecondaryContainer} />
        <Text style={styles.navTabActiveText}>Rotas</Text>
      </View>
      <Pressable style={styles.navTab} onPress={onPressSync}>
        <View>
          <MaterialIcons name="sync" size={22} color={c.onSurfaceVariant} />
          {pendingSync > 0 ? <View style={styles.navTabBadge} /> : null}
        </View>
        <Text style={styles.navTabText}>Sincronização</Text>
      </Pressable>
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
    height: 56,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    color: c.onSurface,
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
    gap: 24,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    justifyContent: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 16,
    zIndex: 1,
  },
  searchInput: {
    height: 52,
    paddingLeft: 48,
    paddingRight: 16,
    backgroundColor: c.inputBackground,
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 8,
    fontSize: 16,
    color: c.onSurface,
  },
  filterButton: {
    width: 52,
    height: 52,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: c.outlineVariant,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    gap: 16,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 48,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.outlineVariant,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  navTab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  navTabText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: c.onSurfaceVariant,
  },
  navTabActive: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: c.secondaryContainer,
  },
  navTabActiveText: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: c.onSecondaryContainer,
  },
  navTabBadge: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.warning,
    borderWidth: 2,
    borderColor: c.surface,
  },
});
