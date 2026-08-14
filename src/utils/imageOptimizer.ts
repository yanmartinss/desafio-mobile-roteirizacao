import { Image } from "react-native";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const MAX_WIDTH = 1080;
const COMPRESSION_QUALITY = 0.65;

function getImageWidth(uri: string): Promise<number> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width) => resolve(width),
      (error) => reject(error),
    );
  });
}

/**
 * Resizes (max width 1080px, aspect ratio preserved) and JPEG-compresses
 * (65% quality) a captured photo before it's persisted or sent for OCR.
 * Falls back to the original URI on any failure, so a broken manipulation
 * never blocks the capture flow.
 */
export async function optimizeImage(uri: string): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri);

    const width = await getImageWidth(uri).catch(() => null);
    if (width === null || width > MAX_WIDTH) {
      context.resize({ width: MAX_WIDTH });
    }

    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({
      compress: COMPRESSION_QUALITY,
      format: SaveFormat.JPEG,
    });

    return result.uri;
  } catch (error) {
    console.warn(
      "[imageOptimizer] Falha ao otimizar a imagem, usando original:",
      error,
    );
    return uri;
  }
}
