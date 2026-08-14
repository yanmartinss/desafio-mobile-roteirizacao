import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useDevNetworkStore } from "../store/devNetworkStore";

const MODES: {
  override: boolean | null;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}[] = [
  { override: null, label: "Auto", icon: "autorenew" },
  { override: false, label: "Offline", icon: "wifi-off" },
  { override: true, label: "Online", icon: "wifi" },
];

export function DevNetworkToggle() {
  const insets = useSafeAreaInsets();
  const override = useDevNetworkStore((s) => s.override);
  const setOverride = useDevNetworkStore((s) => s.setOverride);

  const currentIndex = MODES.findIndex((m) => m.override === override);
  const current = MODES[currentIndex === -1 ? 0 : currentIndex];

  function handlePress() {
    const nextIndex = (currentIndex + 1) % MODES.length;
    setOverride(MODES[nextIndex].override);
  }

  return (
    <Pressable
      style={[styles.pill, { top: insets.top + 8 }]}
      onPress={handlePress}
    >
      <MaterialIcons name={current.icon} size={14} color="#ffffff" />
      <Text style={styles.text}>Rede: {current.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    right: 12,
    zIndex: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "rgba(9, 20, 38, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
});
