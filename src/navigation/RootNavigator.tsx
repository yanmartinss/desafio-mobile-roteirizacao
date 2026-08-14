import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";
import { RouteSelectionScreen } from "../screens/RouteSelectionScreen";
import { RouteListScreen } from "../screens/RouteListScreen";
import { PointDetailScreen } from "../screens/PointDetailScreen";
import { SyncScreen } from "../screens/SyncScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="RouteSelection"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="RouteSelection" component={RouteSelectionScreen} />
        <Stack.Screen name="RouteList" component={RouteListScreen} />
        <Stack.Screen name="PointDetail" component={PointDetailScreen} />
        <Stack.Screen name="Sync" component={SyncScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
