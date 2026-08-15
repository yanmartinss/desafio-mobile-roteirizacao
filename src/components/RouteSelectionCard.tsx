import { Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Route, Visit } from "../types";
import { meterConnectColors as c } from "../theme/meterConnectColors";

// Colors from the selection-route.html prototype that don't have an
// equivalent token in meterConnectColors — kept literal to match the
// prototype exactly, same convention already used for one-off banner
// colors elsewhere (e.g. the disconnected-state red in RouteListScreen).
const ACCENT_BLUE = "#0EA5E9";

export type RouteCardVariant = "pending" | "in_progress" | "completed";

export interface RouteProgress {
  total: number;
  completed: number;
  pending: number;
  percent: number;
  variant: RouteCardVariant;
}

// Translation for the root JSON `status` field (e.g. "assigned"). Used only
// for the badge's text below — the card's structural layout (stats grid,
// progress bar, completed footer) is driven by computeRouteProgress instead,
// since route.status is static and never updated by the app once loaded,
// while the badge text should still reflect what the JSON actually says.
const ROUTE_STATUS_LABEL: Record<string, string> = {
  assigned: "Atribuída",
  in_progress: "Em Andamento",
  completed: "Concluída",
};

// Derived from real visit data (not the static JSON `status` field) so the
// card's layout reflects actual progress — the JSON's `status` never
// changes once loaded, but points get visited locally over time.
export function computeRouteProgress(
  route: Route,
  visits: Visit[],
): RouteProgress {
  const visitedIds = new Set(visits.map((v) => v.pointId));
  const total = route.points.length;
  const completed = route.points.filter((p) => visitedIds.has(p.id)).length;
  const pending = total - completed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const variant: RouteCardVariant =
    completed === 0
      ? "pending"
      : completed === total
        ? "completed"
        : "in_progress";
  return { total, completed, pending, percent, variant };
}

const VARIANT_META: Record<
  RouteCardVariant,
  {
    badgeBg: string;
    badgeText: string;
    badgeIcon: keyof typeof MaterialIcons.glyphMap;
    badgeLabel: string;
  }
> = {
  pending: {
    badgeBg: c.surfaceVariant,
    badgeText: c.onSurfaceVariant,
    badgeIcon: "pending",
    badgeLabel: "Pendente",
  },
  in_progress: {
    badgeBg: c.secondaryContainer,
    badgeText: c.onSecondaryContainer,
    badgeIcon: "schedule",
    badgeLabel: "Em Andamento",
  },
  completed: {
    badgeBg: c.completedBadgeBg,
    badgeText: c.completedBadgeText,
    badgeIcon: "check-circle",
    badgeLabel: "Finalizada",
  },
};

interface Props {
  route: Route;
  progress: RouteProgress;
  onOpen: () => void;
}

export function RouteSelectionCard({ route, progress, onOpen }: Props) {
  const meta = VARIANT_META[progress.variant];
  const badgeLabel = ROUTE_STATUS_LABEL[route.status] ?? meta.badgeLabel;
  const isCompleted = progress.variant === "completed";
  const isInProgress = progress.variant === "in_progress";

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      <View style={styles.topRow}>
        <View style={styles.topRowLeft}>
          <View style={styles.chipRow}>
            <View style={styles.neighborhoodChip}>
              <Text style={styles.neighborhoodChipText}>
                {route.neighborhood}
              </Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: meta.badgeBg }]}
            >
              <MaterialIcons
                name={meta.badgeIcon}
                size={14}
                color={meta.badgeText}
              />
              <Text style={[styles.statusBadgeText, { color: meta.badgeText }]}>
                {badgeLabel}
              </Text>
            </View>
          </View>
          <Text
            style={[styles.title, isCompleted && styles.titleCompleted]}
            numberOfLines={2}
          >
            {route.routeName}
          </Text>
        </View>
      </View>

      {!isCompleted ? (
        <View style={styles.statsGrid}>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{progress.total}</Text>
            <Text style={styles.statLabel}>Visitas</Text>
          </View>
          <View style={[styles.statCell, styles.statCellBordered]}>
            <Text style={[styles.statValue, { color: c.success }]}>
              {progress.completed}
            </Text>
            <Text style={styles.statLabel}>Concluídas</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={[styles.statValue, { color: c.warning }]}>
              {progress.pending}
            </Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
        </View>
      ) : null}

      {isInProgress ? (
        <View>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressLabel}>Progresso da Rota</Text>
            <Text style={styles.progressPercent}>{progress.percent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress.percent}%`, backgroundColor: ACCENT_BLUE },
              ]}
            />
          </View>
        </View>
      ) : null}

      {!isCompleted ? (
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: isInProgress ? ACCENT_BLUE : c.primary },
            pressed && { opacity: 0.85 },
          ]}
          onPress={onOpen}
        >
          <MaterialIcons
            name={isInProgress ? "play-arrow" : "route"}
            size={20}
            color="#ffffff"
          />
          <Text style={styles.actionButtonText}>
            {isInProgress ? "Retomar Rota" : "Iniciar Rota"}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.completedFooter}>
          <Text style={styles.completedFooterText}>
            {progress.completed}/{progress.total} Visitas Concluídas
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.summaryButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onOpen}
          >
            <Text style={styles.summaryButtonText}>Ver Resumo</Text>
            <MaterialIcons name="chevron-right" size={20} color={ACCENT_BLUE} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: c.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardCompleted: {
    backgroundColor: c.screenBackground,
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  topRowLeft: {
    flex: 1,
    gap: 8,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  neighborhoodChip: {
    backgroundColor: c.inputBackground,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  neighborhoodChipText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: c.onSurfaceVariant,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: c.primary,
  },
  titleCompleted: {
    color: c.onSurfaceVariant,
  },
  statsGrid: {
    flexDirection: "row",
    backgroundColor: c.inputBackground,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    borderRadius: 8,
    paddingVertical: 12,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
  },
  statCellBordered: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: c.outlineVariant,
    borderRightColor: c.outlineVariant,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: c.primary,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: c.onSurfaceVariant,
  },
  progressHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: c.onSurfaceVariant,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: "700",
    color: c.primary,
  },
  progressTrack: {
    width: "100%",
    height: 12,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  actionButton: {
    height: 52,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  completedFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: c.outlineVariant,
  },
  completedFooterText: {
    fontSize: 14,
    color: c.onSurfaceVariant,
  },
  summaryButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: ACCENT_BLUE,
  },
});
