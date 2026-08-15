import { Pressable, StyleSheet, Text, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { meterConnectColors as c } from "../theme/meterConnectColors";

export function OfflineEmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.wrap}>
      <MaterialIcons name="cloud-off" size={40} color={c.onSurfaceVariant} />
      <Text style={styles.text}>
        Você está offline e não há dados salvos. Conecte-se à internet para
        realizar a carga inicial.
      </Text>
      <Pressable
        style={({ pressed }) => [
          styles.retryButton,
          pressed && { opacity: 0.8 },
        ]}
        onPress={onRetry}
      >
        <MaterialIcons name="refresh" size={18} color="#ffffff" />
        <Text style={styles.retryButtonText}>Tentar novamente</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    color: c.onSurfaceVariant,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 4,
    backgroundColor: c.primary,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});
