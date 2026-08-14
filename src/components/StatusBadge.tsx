import { StyleSheet, Text, View } from "react-native";
import { meterColors } from "../theme/meterColors";

const LABELS: Record<string, string> = {
  pending: "Pendente",
  visited: "Visitado",
  syncing: "Sincronizando",
  synced: "Sincronizado",
  error: "Erro",
};

const STYLES: Record<
  string,
  { dot: string; background: string; text: string }
> = {
  pending: {
    dot: meterColors.warning,
    background: meterColors.warningMuted,
    text: meterColors.warning,
  },
  visited: {
    dot: meterColors.action,
    background: meterColors.actionMuted,
    text: meterColors.action,
  },
  syncing: {
    dot: meterColors.action,
    background: meterColors.actionMuted,
    text: meterColors.action,
  },
  synced: {
    dot: meterColors.success,
    background: meterColors.successMuted,
    text: meterColors.success,
  },
  error: {
    dot: meterColors.danger,
    background: meterColors.dangerMuted,
    text: meterColors.danger,
  },
};

const FALLBACK = {
  dot: meterColors.mutedForeground,
  background: meterColors.muted,
  text: meterColors.mutedForeground,
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? FALLBACK;
  const label = LABELS[status] ?? status;

  return (
    <View style={[styles.badge, { backgroundColor: style.background }]}>
      <View style={[styles.dot, { backgroundColor: style.dot }]} />
      <Text style={[styles.label, { color: style.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
