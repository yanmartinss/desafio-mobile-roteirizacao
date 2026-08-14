import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { useDevNetworkStore } from "../store/devNetworkStore";

// One-shot connectivity check for non-component code (e.g. routeService),
// honoring the same __DEV__ override used by the hook below so the two
// stay consistent when testing offline behavior from the dev menu.
export async function checkIsOnline(): Promise<boolean> {
  const override = __DEV__ ? useDevNetworkStore.getState().override : null;
  if (override !== null) return override;

  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const override = useDevNetworkStore((s) => s.override);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(
        Boolean(state.isConnected && state.isInternetReachable !== false),
      );
    });
    return unsubscribe;
  }, []);

  return __DEV__ ? (override ?? isOnline) : isOnline;
}
