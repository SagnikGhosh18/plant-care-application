import { create } from 'zustand';
import type { Reminder } from '../types/reminder';

type ReminderStore = {
  reminders: Reminder[];
  isLoading: boolean;
  setReminders: (reminders: Reminder[]) => void;
  addReminder: (reminder: Reminder) => void;
  updateReminder: (updated: Reminder) => void;
  removeRemindersForPlant: (plantId: string) => void;
};

export const useReminderStore = create<ReminderStore>((set) => ({
  reminders: [],
  isLoading: true,
  setReminders: (reminders) => set({ reminders, isLoading: false }),
  addReminder: (reminder) =>
    set((state) => ({ reminders: [...state.reminders, reminder] })),
  updateReminder: (updated) =>
    set((state) => ({
      reminders: state.reminders.map((r) => (r.id === updated.id ? updated : r)),
    })),
  removeRemindersForPlant: (plantId) =>
    set((state) => ({
      reminders: state.reminders.filter((r) => r.plant_id !== plantId),
    })),
}));
