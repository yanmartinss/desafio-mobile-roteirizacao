import { Linking, Platform } from "react-native";

const WEB_FALLBACK = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export async function openInMaps(
  latitude: number,
  longitude: number,
  label: string,
): Promise<void> {
  const encodedLabel = encodeURIComponent(label);

  const url = Platform.select({
    ios: `maps:0,0?q=${encodedLabel}@${latitude},${longitude}`,
    android: `geo:0,0?q=${latitude},${longitude}(${encodedLabel})`,
    default: WEB_FALLBACK(latitude, longitude),
  });

  try {
    // geo:/maps: schemes can report as unopenable on Android 11+ due to
    // package-visibility rules even when a map app can handle them, so we
    // attempt to open directly and only fall back to the browser on failure.
    await Linking.openURL(url);
  } catch {
    await Linking.openURL(WEB_FALLBACK(latitude, longitude));
  }
}
