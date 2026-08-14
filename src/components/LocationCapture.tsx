import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Location from "expo-location";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { meterConnectColors as c } from "../theme/meterConnectColors";

export interface CapturedLocation {
  latitude: number;
  longitude: number;
  capturedAt: string;
}

interface Props {
  location: CapturedLocation | null;
  onCapture: (location: CapturedLocation) => void;
  disabled?: boolean;
}

export function LocationCapture({ location, onCapture, disabled }: Props) {
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [loading, setLoading] = useState(false);

  async function handleGetLocation() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setLoading(true);
    try {
      const position = await Location.getCurrentPositionAsync();
      onCapture({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        capturedAt: new Date(position.timestamp).toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.triggerButton,
          disabled && styles.triggerButtonDisabled,
          pressed && !disabled && !loading && styles.pressed,
        ]}
        onPress={handleGetLocation}
        disabled={loading || disabled}
      >
        {loading ? (
          <ActivityIndicator size="small" color={c.onSecondaryContainer} />
        ) : (
          <MaterialIcons
            name="location-on"
            size={22}
            color={c.onSecondaryContainer}
          />
        )}
        <Text style={styles.triggerButtonText}>
          {loading ? "Obtendo localização" : "Obter localização"}
        </Text>
      </Pressable>

      {location ? (
        <View style={styles.coordsRow}>
          <MaterialIcons name="check-circle" size={16} color={c.secondary} />
          <Text style={styles.coordsText}>
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  pressed: {
    opacity: 0.8,
  },
  triggerButton: {
    height: 56,
    borderRadius: 8,
    backgroundColor: c.secondaryContainer,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  triggerButtonDisabled: {
    opacity: 0.5,
  },
  triggerButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: c.onSecondaryContainer,
  },
  coordsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    backgroundColor: c.surfaceContainerLowest,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  coordsText: {
    fontSize: 12,
    fontWeight: "600",
    color: c.onSurfaceVariant,
  },
});
