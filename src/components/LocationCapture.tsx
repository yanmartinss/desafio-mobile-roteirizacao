import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  wasNotCaptured?: boolean;
}

export function LocationCapture({
  location,
  onCapture,
  disabled,
  wasNotCaptured,
}: Props) {
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const [loading, setLoading] = useState(false);

  async function handleGetLocation() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      Alert.alert(
        "GPS desligado",
        "Ative a localização (GPS) do aparelho para registrar o ponto da leitura.",
      );
      return;
    }

    setLoading(true);
    try {
      // getCurrentPositionAsync has no built-in timeout — indoors or with a
      // weak signal it can hang the spinner forever instead of failing, so
      // race it against a manual timeout and fall back to the last known
      // fix (still useful, just possibly a bit stale) before giving up.
      const position = await Promise.race([
        Location.getCurrentPositionAsync(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 15000),
        ),
      ]).catch(async () => {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (!lastKnown) throw new Error("Sem localização disponível");
        return lastKnown;
      });

      onCapture({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        capturedAt: new Date(position.timestamp).toISOString(),
      });
    } catch (error) {
      console.warn("[Location] Falha ao obter localização:", error);
      Alert.alert(
        "Localização não capturada",
        "Não foi possível obter a localização. Verifique se o GPS está ativo, tente ficar a céu aberto e tente novamente.",
      );
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
      ) : wasNotCaptured ? (
        <View style={styles.coordsRow}>
          <MaterialIcons
            name="info-outline"
            size={16}
            color={c.onSurfaceVariant}
          />
          <Text style={styles.coordsText}>Localização não foi capturada</Text>
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
