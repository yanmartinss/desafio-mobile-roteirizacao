import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { meterConnectColors as c } from "../theme/meterConnectColors";

interface Props {
  pendingSync: number;
  onPressSync: () => void;
}

export function BottomNavBar({ pendingSync, onPressSync }: Props) {
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
