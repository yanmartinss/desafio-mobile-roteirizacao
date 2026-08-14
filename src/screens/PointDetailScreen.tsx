import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
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
import { getVisitForPoint } from "../storage/database";
import { ReadingInput } from "../components/ReadingInput";
import { PhotoCapture } from "../components/PhotoCapture";
import {
  LocationCapture,
  CapturedLocation,
} from "../components/LocationCapture";
import { StatusBadge } from "../components/StatusBadge";
import { Visit } from "../types";
import { meterConnectColors as c } from "../theme/meterConnectColors";
import { openInMaps } from "../utils/openInMaps";

type Props = NativeStackScreenProps<RootStackParamList, "PointDetail">;

export function PointDetailScreen({ route, navigation }: Props) {
  const { pointId } = route.params;
  const point = useRouteStore((s) =>
    s.route?.points.find((p) => p.id === pointId),
  );
  const completeVisit = useVisitStore((s) => s.completeVisit);

  const [reading, setReading] = useState("");
  const [readingError, setReadingError] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoCapturedAt, setPhotoCapturedAt] = useState<string | null>(null);
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [existingVisit, setExistingVisit] = useState<Visit | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getVisitForPoint(pointId).then((visit) => {
      if (visit) {
        setExistingVisit(visit);
        setReading(String(visit.currentReading));
        setPhotoUri(visit.photo || null);
        setPhotoCapturedAt(visit.photo ? visit.capturedAt : null);
        setLocation({
          latitude: visit.latitude,
          longitude: visit.longitude,
          capturedAt: visit.capturedAt,
        });
      }
    });
  }, [pointId]);

  if (!point) {
    return (
      <View style={styles.center}>
        <Text style={styles.mutedText}>Ponto não encontrado.</Text>
      </View>
    );
  }

  function validateReading(value: string): boolean {
    if (!value.trim()) {
      setReadingError("A leitura é obrigatória.");
      return false;
    }
    if (isNaN(Number(value))) {
      setReadingError("Informe um valor numérico válido.");
      return false;
    }
    setReadingError(null);
    return true;
  }

  function handleComplete() {
    if (isLocked || !validateReading(reading) || !point) return;

    if (!photoUri || !location) {
      Alert.alert(
        "Dados incompletos",
        "É necessário tirar a foto e obter a localização antes de concluir a visita.",
      );
      return;
    }

    Alert.alert(
      existingVisit ? "Salvar alterações?" : "Concluir visita?",
      existingVisit
        ? "Deseja salvar as alterações desta visita agora?"
        : "Deseja concluir esta visita agora? Você ainda poderá editá-la até que seja sincronizada.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: () => saveVisit() },
      ],
    );
  }

  async function saveVisit() {
    if (!point) return;

    setSubmitting(true);
    try {
      const visit: Visit = {
        pointId: point.id,
        installationCode: point.installationCode,
        meterNumber: point.meterNumber,
        previousReading: point.previousReading,
        currentReading: Number(reading),
        latitude: location?.latitude ?? 0,
        longitude: location?.longitude ?? 0,
        capturedAt: location?.capturedAt ?? new Date().toISOString(),
        photo: photoUri ?? "",
        syncStatus: "pending",
      };
      await completeVisit(visit);
      Alert.alert(
        "Visita concluída",
        "Os dados foram salvos localmente e aguardam sincronização.",
      );
      navigation.goBack();
    } finally {
      setSubmitting(false);
    }
  }

  const isReadingValid = reading.trim() !== "" && !isNaN(Number(reading));
  const hasPhoto = Boolean(photoUri);
  const hasLocation = Boolean(location);
  const canComplete = isReadingValid && hasPhoto && hasLocation;
  // Edits stay allowed while the visit hasn't synced yet — only a synced
  // visit is truly final and read-only.
  const isLocked = existingVisit?.syncStatus === "synced";

  const missingParts = [
    !isReadingValid && "a leitura",
    !hasPhoto && "a foto",
    !hasLocation && "a localização",
  ].filter((part): part is string => Boolean(part));

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
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Visita</Text>
        </View>
        <View style={styles.headerIconButton} />
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {isLocked ? (
          <View style={styles.lockedBanner}>
            <MaterialIcons name="lock" size={18} color={c.onSurfaceVariant} />
            <Text style={styles.lockedBannerText}>
              Esta visita já foi sincronizada e não pode mais ser alterada.
            </Text>
          </View>
        ) : existingVisit ? (
          <View style={styles.pendingEditBanner}>
            <MaterialIcons name="edit" size={18} color={c.pendingBadgeText} />
            <Text style={styles.pendingEditBannerText}>
              Visita salva localmente, aguardando sincronização. Você ainda
              pode editar a leitura, a foto e a localização.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.customerName}>{point.customer}</Text>
            <StatusBadge status={existingVisit?.syncStatus ?? point.status} />
          </View>

          <View style={styles.addressRow}>
            <MaterialIcons
              name="location-on"
              size={16}
              color={c.onSurfaceVariant}
            />
            <Text style={styles.addressText}>{point.address}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.openMapsButton,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              openInMaps(point.latitude, point.longitude, point.address)
            }
          >
            <MaterialIcons
              name="directions"
              size={18}
              color={c.onSecondaryContainer}
            />
            <Text style={styles.openMapsButtonText}>Abrir no mapa</Text>
          </Pressable>

          <Text style={[styles.infoLine, styles.infoLineSpaced]}>
            <Text style={styles.infoLineLabel}>Instalação: </Text>
            {point.installationCode}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.infoLineLabel}>Medidor: </Text>
            {point.meterNumber}
          </Text>
          <Text style={styles.infoLine}>
            <Text style={styles.infoLineLabel}>Leitura anterior: </Text>
            {point.previousReading}
          </Text>
        </View>

        <ReadingInput
          value={reading}
          onChangeText={(text) => {
            setReading(text);
            if (readingError) validateReading(text);
          }}
          error={readingError}
          disabled={isLocked}
        />

        <View style={styles.captureRow}>
          <PhotoCapture
            photoUri={photoUri}
            capturedAt={photoCapturedAt}
            onCapture={(uri, takenAt) => {
              setPhotoUri(uri);
              setPhotoCapturedAt(takenAt);
            }}
            onSuggestReading={(value) => {
              setReading(value);
              setReadingError(null);
            }}
            disabled={isLocked}
          />
          <LocationCapture
            location={location}
            onCapture={setLocation}
            disabled={isLocked}
          />
        </View>

        {!isLocked && missingParts.length > 0 ? (
          <View style={styles.missingBanner}>
            <MaterialIcons name="info" size={16} color={c.pendingBadgeText} />
            <Text style={styles.missingBannerText}>
              Informe {missingParts.join(", ")} para concluir a visita.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={styles.footer}>
        {isLocked ? (
          <View style={styles.lockedStatus}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={c.completedBadgeText}
            />
            <Text style={styles.lockedStatusText}>
              Leitura concluída e sincronizada
            </Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              !canComplete && styles.saveButtonDisabled,
              pressed && canComplete && styles.pressed,
            ]}
            onPress={handleComplete}
            disabled={!canComplete || submitting}
          >
            <MaterialIcons
              name="save"
              size={20}
              color={c.onSecondaryContainer}
            />
            <Text style={styles.saveButtonText}>
              {submitting
                ? "Salvando..."
                : existingVisit
                  ? "Salvar alterações"
                  : "Concluir visita"}
            </Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.screenBackground,
  },
  pressed: {
    opacity: 0.7,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.screenBackground,
  },
  mutedText: {
    color: c.onSurfaceVariant,
  },
  header: {
    backgroundColor: c.surfaceContainerHighest,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
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
  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600",
    color: c.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: c.onSurfaceVariant,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  card: {
    backgroundColor: c.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    borderRadius: 4,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customerName: {
    fontSize: 20,
    fontWeight: "700",
    color: c.onSurface,
    flexShrink: 1,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: c.onSurfaceVariant,
  },
  infoLine: {
    fontSize: 16,
    color: c.onSurface,
  },
  infoLineSpaced: {
    marginTop: 4,
  },
  infoLineLabel: {
    fontWeight: "700",
    color: c.onSurfaceVariant,
  },
  openMapsButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: c.secondaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  openMapsButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: c.onSecondaryContainer,
  },
  captureRow: {
    gap: 12,
  },
  missingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.pendingBadgeBg,
    backgroundColor: c.pendingBadgeBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  missingBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: c.pendingBadgeText,
  },
  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    backgroundColor: c.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lockedBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: c.onSurfaceVariant,
  },
  pendingEditBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.pendingBadgeBg,
    backgroundColor: c.pendingBadgeBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pendingEditBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: c.pendingBadgeText,
  },
  footer: {
    backgroundColor: c.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: c.outlineVariant,
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: c.secondaryContainer,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 20,
    fontWeight: "600",
    color: c.onSecondaryContainer,
  },
  lockedStatus: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: c.completedBadgeBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  lockedStatusText: {
    fontSize: 15,
    fontWeight: "700",
    color: c.completedBadgeText,
  },
});
