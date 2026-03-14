import { useCallback } from 'react';
import { useReminderStore } from '../store/useReminderStore';
import { usePlantStore } from '../store/usePlantStore';
import * as RemindersDB from '../db/reminders';
import { cancelNotification, scheduleReminder } from '../services/notifications';
import type { Reminder } from '../types/reminder';

const RESCHEDULE_DAYS: Record<string, number> = {
  water: 3,
  fertilize: 14,
  repot: 365,
  rotate: 14,
};

function msFromNow(days: number): number {
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

export type ReminderHistoryEntry = {
  id: string;
  type: Reminder['type'];
  status: 'completed' | 'missed' | 'upcoming';
  date: number; // completed_at for completed, scheduled_at otherwise
};

export function useReminders() {
  const { reminders, isLoading, updateReminder } = useReminderStore();
  const { plants } = usePlantStore();

  // All reminders are shown — completed_at = last done, scheduled_at = next due
  const pendingReminders = reminders;

  const completeReminder = useCallback(
    async (reminderId: string): Promise<void> => {
      const reminder = reminders.find((r) => r.id === reminderId);
      if (!reminder) return;

      const completedAt = Date.now();

      if (reminder.notification_id) {
        await cancelNotification(reminder.notification_id);
      }

      const plant = plants.find((p) => p.id === reminder.plant_id);
      if (!plant) return;

      const days = RESCHEDULE_DAYS[reminder.type] ?? 7;
      const nextScheduled = msFromNow(days);
      const newNotificationId = await scheduleReminder(
        { ...reminder, scheduled_at: nextScheduled, notification_id: null },
        plant
      );

      await RemindersDB.markReminderComplete(reminder.id, completedAt);
      await RemindersDB.updateReminderSchedule(reminder.id, nextScheduled, newNotificationId);

      const updated: Reminder = {
        ...reminder,
        completed_at: completedAt,
        scheduled_at: nextScheduled,
        notification_id: newNotificationId,
      };
      updateReminder(updated);
    },
    [reminders, plants, updateReminder]
  );

  function getPlantHistory(plantId: string): ReminderHistoryEntry[] {
    const now = Date.now();
    const entries: ReminderHistoryEntry[] = [];
    for (const r of reminders.filter((r) => r.plant_id === plantId)) {
      if (r.completed_at !== null) {
        entries.push({ id: `${r.id}-done`, type: r.type, status: 'completed', date: r.completed_at });
      }
      entries.push({
        id: `${r.id}-next`,
        type: r.type,
        status: r.scheduled_at < now ? 'missed' : 'upcoming',
        date: r.scheduled_at,
      });
    }
    return entries.sort((a, b) => b.date - a.date);
  }

  function getMissedCount(plantId: string): number {
    const now = Date.now();
    return reminders.filter(
      (r) => r.plant_id === plantId && r.scheduled_at < now
    ).length;
  }

  return { reminders: pendingReminders, isLoading, completeReminder, getPlantHistory, getMissedCount };
}
