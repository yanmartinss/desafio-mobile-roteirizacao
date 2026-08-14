import { create } from "zustand";

interface DevNetworkStore {
  override: boolean | null;
  setOverride: (value: boolean | null) => void;
}

export const useDevNetworkStore = create<DevNetworkStore>((set) => ({
  override: null,
  setOverride: (value) => set({ override: value }),
}));
