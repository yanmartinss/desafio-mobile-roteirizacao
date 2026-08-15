import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { getBackLabel } from "../navigation/backLabel";
import { useRouteStore } from "../store/routeStore";
import { useVisitStore } from "../store/visitStore";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { meterConnectColors as c } from "../theme/meterConnectColors";
import { SyncStatus, Visit } from "../types";

interface SyncSection {
  key: string;
  routeName: string;
  showRouteName: boolean;
  statusLabel: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  selectable: boolean;
  data: Visit[];
}

// Grouped by route first (today there's only ever one, but visits already
// carry pointId → route.points linkage, so this scales cleanly if the app
// ever loads more than one route), then split by sync status within each —
// pending/syncing/error visits separated from synced ones, so it's obvious
// at a glance what's still actionable per route. Only the first section for
// a given route carries `showRouteName: true`, so the route name is printed
// once per route instead of once per status group.
function buildSyncSections(
  routes: { routeId: string; routeName: string; points: { id: number }[] }[],
  visits: Visit[],
): SyncSection[] {
  return routes.flatMap((r) => {
    const routePointIds = new Set(r.points.map((p) => p.id));
    const routeVisits = visits.filter((v) => routePointIds.has(v.pointId));
    const unsynced = routeVisits.filter((v) => v.syncStatus !== "synced");
    const synced = routeVisits.filter((v) => v.syncStatus === "synced");

    const sections: SyncSection[] = [];
    if (unsynced.length > 0) {
      sections.push({
        key: `${r.routeId}-pending`,
        routeName: r.routeName,
        showRouteName: true,
        statusLabel: "Pendentes de sincronização",
        icon: "pending",
        selectable: true,
        data: unsynced,
      });
    }
    if (synced.length > 0) {
      sections.push({
        key: `${r.routeId}-synced`,
        routeName: r.routeName,
        showRouteName: sections.length === 0,
        statusLabel: "Sincronizados",
        icon: "check-circle",
        selectable: false,
        data: synced,
      });
    }
    return sections;
  });
}

type Props = NativeStackScreenProps<RootStackParamList, "Sync">;

const STATUS_META: Record<
  SyncStatus,
  {
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    bg: string;
    text: string;
  }
> = {
  pending: {
    label: "Sincronização pendente",
    icon: "pending",
    bg: "#fef3c7",
    text: "#92400e",
  },
  syncing: {
    label: "Enviando...",
    icon: "sync",
    bg: "#dbeafe",
    text: "#1e3a8a",
  },
  synced: {
    label: "Sincronizado",
    icon: "check-circle",
    bg: "#dcfce7",
    text: "#166534",
  },
  error: {
    label: "Falha no envio",
    icon: "error",
    bg: c.errorContainer,
    text: c.onErrorContainer,
  },
};

export function SyncScreen({ navigation }: Props) {
  const route = useRouteStore((s) => s.route);
  const { visits, syncing, loadVisits, syncAll } = useVisitStore();
  const isOnline = useNetworkStatus();
  // Items the user has explicitly opted OUT of syncing. Starts empty, so
  // by default everything pending is selected — same as the old
  // "always sync everything" behavior — and only shrinks the sync run when
  // the user actually deselects something.
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadVisits();
  }, []);

  const pendingVisits = visits.filter(
    (v) => v.syncStatus === "pending" || v.syncStatus === "error",
  );
  const pendingCount = pendingVisits.length;
  const selectedIds = pendingVisits
    .filter((v) => !excludedIds.has(v.pointId))
    .map((v) => v.pointId);
  const selectedCount = selectedIds.length;

  const backLabel = getBackLabel(navigation);
  const sections = buildSyncSections(route ? [route] : [], visits);

  function toggleSelected(pointId: number) {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pointId)) next.delete(pointId);
      else next.add(pointId);
      return next;
    });
  }

  function toggleSelectAll() {
    setExcludedIds((prev) => {
      const allSelected = pendingVisits.every((v) => !prev.has(v.pointId));
      return allSelected
        ? new Set(pendingVisits.map((v) => v.pointId))
        : new Set();
    });
  }

  function handleSyncPress() {
    if (!isOnline) {
      Alert.alert(
        "Sem conexão",
        "Conecte-se à internet para sincronizar os dados pendentes.",
      );
      return;
    }
    if (selectedCount === 0) return;
    syncAll(selectedIds);
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.headerBackButton,
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={22} color={c.primary} />
          <Text style={styles.headerBackButtonText}>{backLabel}</Text>
        </Pressable>
      </SafeAreaView>

      <SectionList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        sections={sections}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item) => String(item.pointId)}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons
                name={section.icon}
                size={16}
                color={c.onSurfaceVariant}
              />
              <Text style={styles.sectionHeaderText}>
                {section.statusLabel} ({section.data.length})
              </Text>
            </View>
            {section.showRouteName ? (
              <Text style={styles.sectionHeaderRoute}>
                {section.routeName}
              </Text>
            ) : null}
            {section.selectable ? (
              <Pressable onPress={toggleSelectAll} hitSlop={8}>
                <Text style={styles.selectAllText}>
                  {selectedCount === pendingCount
                    ? "Desmarcar todos"
                    : "Selecionar todos"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
        renderSectionFooter={() => <View style={styles.sectionFooterGap} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.title}>Central de Sincronização</Text>
            <View
              style={[
                styles.networkPill,
                isOnline ? styles.networkPillOnline : styles.networkPillOffline,
              ]}
            >
              <MaterialIcons
                name={isOnline ? "signal-cellular-alt" : "signal-cellular-off"}
                size={16}
                color={isOnline ? "#166534" : c.onErrorContainer}
              />
              <Text
                style={[
                  styles.networkPillText,
                  { color: isOnline ? "#166534" : c.onErrorContainer },
                ]}
              >
                {isOnline ? "Conectado" : "Desconectado"}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma visita registrada ainda.</Text>
        }
        renderItem={({ item, section }) => {
          const point = route?.points.find((p) => p.id === item.pointId);
          return (
            <SyncCard
              visit={item}
              address={point?.address}
              onPress={() =>
                navigation.navigate("PointDetail", { pointId: item.pointId })
              }
              selectable={section.selectable}
              selected={!excludedIds.has(item.pointId)}
              onToggleSelect={() => toggleSelected(item.pointId)}
            />
          );
        }}
      />

      <View style={styles.footerWrap} pointerEvents="box-none">
        <SafeAreaView edges={["bottom"]} style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.syncButton,
              !isOnline &&
                pendingCount > 0 &&
                !syncing &&
                styles.syncButtonOffline,
              (syncing || pendingCount === 0 || selectedCount === 0) &&
                styles.syncButtonDisabled,
              pressed &&
                pendingCount > 0 &&
                selectedCount > 0 &&
                !syncing &&
                styles.pressed,
            ]}
            onPress={handleSyncPress}
            disabled={syncing || pendingCount === 0 || selectedCount === 0}
          >
            {syncing ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.syncButtonText}>Sincronizando...</Text>
              </>
            ) : pendingCount === 0 ? (
              <>
                <MaterialIcons name="check-circle" size={20} color="#ffffff" />
                <Text style={styles.syncButtonText}>Tudo sincronizado</Text>
              </>
            ) : !isOnline ? (
              <>
                <MaterialIcons name="cloud-off" size={20} color="#ffffff" />
                <Text style={styles.syncButtonText}>
                  Sem conexão ({pendingCount})
                </Text>
              </>
            ) : selectedCount === 0 ? (
              <>
                <MaterialIcons name="sync" size={20} color="#ffffff" />
                <Text style={styles.syncButtonText}>
                  Selecione visitas para sincronizar
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons name="sync" size={20} color="#ffffff" />
                <Text style={styles.syncButtonText}>
                  Sincronizar {selectedCount} de {pendingCount}{" "}
                  {pendingCount === 1 ? "item" : "itens"}
                </Text>
              </>
            )}
          </Pressable>
        </SafeAreaView>
      </View>
    </View>
  );
}

function SyncCard({
  visit,
  address,
  onPress,
  selectable,
  selected,
  onToggleSelect,
}: {
  visit: Visit;
  address?: string;
  onPress: () => void;
  selectable: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const status = STATUS_META[visit.syncStatus];
  // Can't toggle something already mid-flight — show it via the existing
  // status spinner instead, not a checkbox.
  const showCheckbox = selectable && visit.syncStatus !== "syncing";
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={showCheckbox ? onToggleSelect : undefined}
    >
      {showCheckbox ? (
        <View style={styles.checkbox}>
          <MaterialIcons
            name={selected ? "check-box" : "check-box-outline-blank"}
            size={24}
            color={selected ? c.secondary : c.outline}
          />
        </View>
      ) : null}

      <View style={styles.thumbnailColumn}>
        <Pressable
          style={styles.thumbnail}
          disabled={!visit.photo}
          onPress={() => setExpanded(true)}
        >
          {visit.photo ? (
            <Image
              source={{ uri: visit.photo }}
              style={styles.thumbnailImage}
            />
          ) : (
            <View style={styles.thumbnailFallback}>
              <MaterialIcons
                name="image-not-supported"
                size={22}
                color={c.onSurfaceVariant}
              />
            </View>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.detailsButton,
            pressed && styles.pressed,
          ]}
          onPress={onPress}
          hitSlop={8}
        >
          <Text style={styles.detailsButtonText}>Ver detalhes</Text>
        </Pressable>
      </View>

      {visit.photo ? (
        <Modal
          visible={expanded}
          transparent
          animationType="fade"
          onRequestClose={() => setExpanded(false)}
        >
          <Pressable
            style={styles.imageModalBackdrop}
            onPress={() => setExpanded(false)}
          >
            <Image
              source={{ uri: visit.photo }}
              style={styles.imageModalPhoto}
              resizeMode="contain"
            />
          </Pressable>
        </Modal>
      ) : null}

      <View style={styles.cardInfo}>
        <Text style={styles.cardCaption}>Endereço</Text>
        <Text style={styles.cardAddress} numberOfLines={2}>
          {address ?? visit.installationCode}
        </Text>

        <Text style={styles.cardCaption}>Número da leitura</Text>
        <Text style={styles.cardValue}>{visit.currentReading}</Text>

        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          {visit.syncStatus === "syncing" ? (
            <ActivityIndicator size="small" color={status.text} />
          ) : (
            <MaterialIcons name={status.icon} size={14} color={status.text} />
          )}
          <Text style={[styles.statusPillText, { color: status.text }]}>
            {status.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  header: {
    backgroundColor: c.surfaceContainerHighest,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 10,
  },
  headerBackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 18,
  },
  headerBackButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: c.primary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 140,
  },
  listHeader: {
    marginBottom: 24,
    gap: 8,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700",
    color: c.onSurface,
  },
  networkPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  networkPillOnline: {
    backgroundColor: "#dcfce7",
    borderColor: "#bbf7d0",
  },
  networkPillOffline: {
    backgroundColor: c.errorContainer,
    borderColor: c.errorContainer,
  },
  networkPillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: c.onSurfaceVariant,
  },
  separator: {
    height: 16,
  },
  sectionHeader: {
    gap: 4,
    backgroundColor: c.surface,
    paddingBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: c.onSurfaceVariant,
  },
  sectionHeaderRoute: {
    fontSize: 12,
    color: c.onSurfaceVariant,
  },
  selectAllText: {
    alignSelf: "flex-end",
    fontSize: 12,
    fontWeight: "700",
    color: c.secondary,
  },
  sectionFooterGap: {
    height: 24,
  },
  card: {
    position: "relative",
    backgroundColor: c.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: c.surfaceVariant,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardPressed: {
    opacity: 0.85,
  },
  checkbox: {
    position: "absolute",
    top: 20,
    right: 16,
    zIndex: 1,
  },
  thumbnailColumn: {
    gap: 8,
  },
  thumbnail: {
    width: 96,
    height: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    backgroundColor: c.surfaceContainer,
    overflow: "hidden",
  },
  detailsButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    paddingVertical: 6,
  },
  detailsButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: c.secondary,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalPhoto: {
    width: "100%",
    height: "100%",
  },
  cardInfo: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 32,
  },
  cardCaption: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: c.onSurfaceVariant,
    marginBottom: 2,
  },
  cardAddress: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    color: c.onSurface,
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.24,
    color: c.primary,
    marginBottom: 10,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  syncButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: c.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  syncButtonOffline: {
    backgroundColor: "#dc2626",
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
  },
});
