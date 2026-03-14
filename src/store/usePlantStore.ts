import { create } from 'zustand';
import type { Plant } from '../types/plant';

type PlantStore = {
  plants: Plant[];
  isLoading: boolean;
  setPlants: (plants: Plant[]) => void;
  addPlant: (plant: Plant) => void;
  updatePlant: (updated: Plant) => void;
  removePlant: (id: string) => void;
};

export const usePlantStore = create<PlantStore>((set) => ({
  plants: [],
  isLoading: true,
  setPlants: (plants) => set({ plants, isLoading: false }),
  addPlant: (plant) => set((state) => ({ plants: [plant, ...state.plants] })),
  updatePlant: (updated) =>
    set((state) => ({
      plants: state.plants.map((p) => (p.id === updated.id ? updated : p)),
    })),
  removePlant: (id) =>
    set((state) => ({ plants: state.plants.filter((p) => p.id !== id) })),
}));
