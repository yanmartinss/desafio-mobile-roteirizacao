import { useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import { meterConnectColors as c } from "../theme/meterConnectColors";
import { SyncStatus, Visit } from "../types";

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

  useEffect(() => {
    loadVisits();
  }, []);

  const pendingCount = visits.filter(
    (v) => v.syncStatus === "pending" || v.syncStatus === "error",
  ).length;

  function handleSyncPress() {
    if (!isOnline) {
      Alert.alert(
        "Sem conexão",
        "Conecte-se à internet para sincronizar os dados pendentes.",
      );
      return;
    }
    syncAll();
  }

  return (
    <View style={styles.screen}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.headerIconButton,
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <MaterialIcons name="arrow-back" size={24} color={c.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Desafio</Text>
        <View style={styles.headerIconButton} />
      </SafeAreaView>

      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={visits}
        keyExtractor={(item) => String(item.pointId)}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
                {isOnline ? "Conectado" : "Sem conexão"}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma visita registrada ainda.</Text>
        }
        renderItem={({ item }) => {
          const point = route?.points.find((p) => p.id === item.pointId);
          return (
            <SyncCard
              visit={item}
              address={point?.address}
              onPress={() =>
                navigation.navigate("PointDetail", { pointId: item.pointId })
              }
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
              (syncing || pendingCount === 0) && styles.syncButtonDisabled,
              pressed && pendingCount > 0 && !syncing && styles.pressed,
            ]}
            onPress={handleSyncPress}
            disabled={syncing || pendingCount === 0}
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
            ) : (
              <>
                <MaterialIcons name="sync" size={20} color="#ffffff" />
                <Text style={styles.syncButtonText}>
                  Sincronizar agora ({pendingCount}{" "}
                  {pendingCount === 1 ? "item" : "itens"})
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
}: {
  visit: Visit;
  address?: string;
  onPress: () => void;
}) {
  const status = STATUS_META[visit.syncStatus];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.thumbnail}>
        {visit.photo ? (
          <Image source={{ uri: visit.photo }} style={styles.thumbnailImage} />
        ) : (
          <View style={styles.thumbnailFallback}>
            <MaterialIcons
              name="image-not-supported"
              size={22}
              color={c.onSurfaceVariant}
            />
          </View>
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={styles.cardCaption}>Endereço</Text>
        <Text style={styles.cardAddress} numberOfLines={1}>
          {address ?? visit.installationCode}
        </Text>

        <Text style={styles.cardCaption}>Número do medidor</Text>
        <Text style={styles.cardValue}>
          {visit.currentReading}
        </Text>

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
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    zIndex: 10,
  },
  headerIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
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
  card: {
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
  thumbnail: {
    width: 96,
    height: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    backgroundColor: c.surfaceContainer,
    overflow: "hidden",
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
  cardInfo: {
    flex: 1,
    justifyContent: "center",
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
    fontSize: 16,
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
