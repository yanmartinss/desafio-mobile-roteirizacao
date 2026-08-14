import TextRecognition from "@react-native-ml-kit/text-recognition";

/**
 * Picks the longest run of 3+ digits found in the OCR text — meter displays
 * are dominated by the reading itself, so the longest digit run is a much
 * better signal than the first one (which is often a serial number prefix).
 * Leading zeros are stripped to match how readings are stored elsewhere
 * (e.g. `previousReading: 12874`, not `"012874"`).
 */
export function extractMeterReading(text: string): string | null {
  const matches = text.match(/\d{3,}/g);
  if (!matches || matches.length === 0) return null;

  const longest = matches.reduce((best, current) =>
    current.length > best.length ? current : best,
  );

  return String(Number(longest));
}

export async function recognizeMeterReading(
  uri: string,
): Promise<string | null> {
  try {
    const result = await TextRecognition.recognize(uri);
    const value = extractMeterReading(result.text);
    if (!value) {
      console.warn("[OCR] Nenhum valor numérico encontrado na foto.");
    }
    return value;
  } catch (error) {
    console.warn("[OCR] Falha ao processar a foto:", error);
    return null;
  }
}
