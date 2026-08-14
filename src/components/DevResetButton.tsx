import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { resetAllVisits } from "../storage/database";
import { useVisitStore } from "../store/visitStore";

export function DevResetButton() {
  const insets = useSafeAreaInsets();

  function handlePress() {
    Alert.alert(
      "Resetar visitas?",
      "Todas as visitas registradas localmente serão apagadas e os pontos voltarão a ficar pendentes.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Resetar",
          style: "destructive",
          onPress: async () => {
            await resetAllVisits();
            await useVisitStore.getState().loadVisits();
          },
        },
      ],
    );
  }

  return (
    <Pressable
      style={[styles.pill, { top: insets.top + 48 }]}
      onPress={handlePress}
    >
      <MaterialIcons name="delete-sweep" size={14} color="#ffffff" />
      <Text style={styles.text}>Resetar visitas</Text>
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
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
});
