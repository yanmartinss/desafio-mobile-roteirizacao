import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { DevNetworkToggle } from "./src/components/DevNetworkToggle";
import { DevResetButton } from "./src/components/DevResetButton";

export default function App() {
  return (
    <SafeAreaProvider>
      <RootNavigator />
      <StatusBar style="auto" />
      {__DEV__ ? <DevNetworkToggle /> : null}
      {__DEV__ ? <DevResetButton /> : null}
    </SafeAreaProvider>
  );
}
