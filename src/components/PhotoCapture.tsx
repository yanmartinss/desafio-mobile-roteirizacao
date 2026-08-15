import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { meterConnectColors as c } from "../theme/meterConnectColors";
import { recognizeMeterReading } from "../utils/ocr";
import { optimizeImage } from "../utils/imageOptimizer";

interface Props {
  photoUri: string | null;
  capturedAt: string | null;
  onCapture: (uri: string, capturedAt: string) => void;
  disabled?: boolean;
}

type OcrStatus = "idle" | "processing" | "found" | "not-found";

// No explicit locale — toLocale*String() picks up the device's own locale
// (DD/MM/YYYY + 24h for pt-BR, MM/DD/YYYY + AM/PM for en-US, etc.).
function formatTimestamp(iso: string) {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString();
  const timePart = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} ${timePart}`;
}

export function PhotoCapture({
  photoUri,
  capturedAt,
  onCapture,
  disabled,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [torchOn, setTorchOn] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>("idle");
  const [recognizedValue, setRecognizedValue] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  async function handleOpen() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setOcrStatus("idle");
    setRecognizedValue(null);
    setIsOpen(true);
  }

  async function handleTakePicture() {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const picture = await cameraRef.current?.takePictureAsync({
        quality: 0.5,
      });
      if (!picture) return;

      const optimizedUri = await optimizeImage(picture.uri);
      onCapture(optimizedUri, new Date().toISOString());
      setIsOpen(false);
      runOcr(optimizedUri);
    } finally {
      setIsProcessing(false);
    }
  }

  async function runOcr(uri: string) {
    setOcrStatus("processing");
    const value = await recognizeMeterReading(uri);
    if (value) {
      setOcrStatus("found");
      setRecognizedValue(value);
    } else {
      setOcrStatus("not-found");
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.triggerButton,
          disabled && styles.triggerButtonDisabled,
          pressed && !disabled && styles.pressed,
        ]}
        onPress={handleOpen}
        disabled={disabled}
      >
        <MaterialIcons
          name="photo-camera"
          size={22}
          color={c.onSecondaryContainer}
        />
        <Text style={styles.triggerButtonText}>Tirar Foto</Text>
      </Pressable>

      {photoUri ? (
        <Pressable
          style={styles.thumbnailRow}
          onPress={() => setIsZoomOpen(true)}
        >
          <Image source={{ uri: photoUri }} style={styles.thumbnailImage} />
          <View style={styles.thumbnailInfo}>
            <Text style={styles.thumbnailText}>
              {capturedAt
                ? `Capturado: ${formatTimestamp(capturedAt)}`
                : "Foto capturada"}
            </Text>
            {recognizedValue ? (
              <Text style={styles.ocrValueText}>
                Texto lido: {recognizedValue}
              </Text>
            ) : null}
            <View style={styles.thumbnailZoomHint}>
              <MaterialIcons name="zoom-in" size={14} color={c.secondary} />
              <Text style={styles.thumbnailZoomText}>Ver foto</Text>
            </View>
          </View>
        </Pressable>
      ) : null}

      {ocrStatus === "processing" ? (
        <View style={styles.ocrRow}>
          <ActivityIndicator size="small" color={c.secondary} />
          <Text style={styles.ocrText}>Lendo valor da foto...</Text>
        </View>
      ) : ocrStatus === "found" ? (
        <View style={styles.ocrRow}>
          <MaterialIcons name="auto-awesome" size={14} color={c.secondary} />
          <Text style={styles.ocrTextSuccess}>Valor identificado na foto.</Text>
        </View>
      ) : ocrStatus === "not-found" ? (
        <View style={styles.ocrRow}>
          <MaterialIcons
            name="info-outline"
            size={14}
            color={c.onSurfaceVariant}
          />
          <Text style={styles.ocrText}>
            Não foi possível identificar o valor automaticamente.
          </Text>
        </View>
      ) : null}

      <Modal visible={isZoomOpen} animationType="fade" transparent>
        <View style={styles.zoomScreen}>
          <Pressable
            style={styles.zoomCloseButton}
            onPress={() => setIsZoomOpen(false)}
            hitSlop={8}
          >
            <MaterialIcons name="close" size={22} color="#ffffff" />
          </Pressable>
          <ScrollView
            style={styles.zoomScroll}
            contentContainerStyle={styles.zoomScrollContent}
            minimumZoomScale={1}
            maximumZoomScale={4}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                style={styles.zoomImage}
                resizeMode="contain"
              />
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={isOpen} animationType="slide">
        <View style={styles.cameraScreen}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing={facing}
            enableTorch={torchOn}
          />

          <View style={styles.topControls}>
            <Pressable
              style={styles.controlButton}
              onPress={() => setIsOpen(false)}
            >
              <MaterialIcons name="close" size={20} color="#ffffff" />
            </Pressable>
            <View style={styles.topControlsRight}>
              <Pressable
                style={styles.controlButton}
                onPress={() => setTorchOn((v) => !v)}
              >
                <MaterialIcons
                  name="flash-on"
                  size={20}
                  color={torchOn ? c.warning : "#ffffff"}
                />
              </Pressable>
              <Pressable
                style={styles.controlButton}
                onPress={() =>
                  setFacing((f) => (f === "back" ? "front" : "back"))
                }
              >
                <MaterialIcons name="cameraswitch" size={20} color="#ffffff" />
              </Pressable>
            </View>
          </View>

          <View style={styles.frameWrap} pointerEvents="none">
            <View style={styles.frame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>

          <View style={styles.guidanceWrap} pointerEvents="none">
            <Text style={styles.guidanceText}>
              Alinhe o medidor dentro do quadro
            </Text>
          </View>

          <View style={styles.shutterWrap}>
            <Pressable
              style={styles.shutterButton}
              onPress={handleTakePicture}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#020617" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const CORNER_SIZE = 32;

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
  thumbnailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.outlineVariant,
    backgroundColor: c.surfaceContainerLowest,
    padding: 6,
  },
  thumbnailImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  thumbnailInfo: {
    flex: 1,
    gap: 2,
  },
  thumbnailText: {
    fontSize: 11,
    fontWeight: "600",
    color: c.onSurfaceVariant,
  },
  ocrValueText: {
    fontSize: 11,
    fontWeight: "700",
    color: c.secondary,
  },
  thumbnailZoomHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  thumbnailZoomText: {
    fontSize: 11,
    fontWeight: "700",
    color: c.secondary,
  },
  ocrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ocrText: {
    flex: 1,
    fontSize: 11,
    color: c.onSurfaceVariant,
  },
  ocrTextSuccess: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: c.secondary,
  },
  zoomScreen: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.96)",
  },
  zoomCloseButton: {
    position: "absolute",
    right: 20,
    top: 56,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  zoomScroll: {
    flex: 1,
  },
  zoomScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomImage: {
    width: "100%",
    aspectRatio: 1,
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: "#020617",
  },
  topControls: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 56,
  },
  topControlsRight: {
    flexDirection: "row",
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2, 6, 23, 0.5)",
  },
  frameWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    width: 288,
    height: 208,
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: c.secondaryContainer,
  },
  cornerTopLeft: {
    left: 0,
    top: 0,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    right: 0,
    top: 0,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    left: 0,
    bottom: 0,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderBottomRightRadius: 12,
  },
  guidanceWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    marginTop: 160,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  guidanceText: {
    borderRadius: 999,
    backgroundColor: "rgba(2, 6, 23, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
  },
  shutterWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingBottom: 48,
  },
  shutterButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "rgba(255, 255, 255, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ffffff",
  },
});
