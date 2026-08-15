import type { NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "./types";

// Screens that can be a "previous screen" worth naming in a back button.
// Both Sync and PointDetail are reachable from more than one place (e.g.
// Sync from RouteSelection's bottom nav AND RouteList's banner; PointDetail
// from RouteList AND Sync's cards), so the back label can't be hardcoded —
// it has to reflect whichever screen is actually one step back in the
// navigation stack.
const SCREEN_LABELS: Partial<Record<keyof RootStackParamList, string>> = {
  RouteSelection: "Seleção de Rotas",
  RouteList: "Rota",
  Sync: "Central de Sincronização",
};

// Not a hook on purpose: the previous stack entry can't change while this
// screen is the focused one, so a plain read at render time is enough —
// no subscription/reactivity needed.
export function getBackLabel(
  navigation: NavigationProp<RootStackParamList>,
  fallback = "Voltar",
): string {
  const state = navigation.getState();
  const previous = state?.routes[state.index - 1];
  if (!previous) return fallback;
  return SCREEN_LABELS[previous.name as keyof RootStackParamList] ?? fallback;
}
