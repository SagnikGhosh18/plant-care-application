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

export function useReminders() {
  const { reminders, isLoading, updateReminder } = useReminderStore();
  const { plants } = usePlantStore();

  const pendingReminders = reminders.filter((r) => r.completed_at === null);

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

  return { reminders: pendingReminders, isLoading, completeReminder };
}
