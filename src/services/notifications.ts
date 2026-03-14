import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import type { Plant } from '../types/plant';
import type { Reminder, ReminderType } from '../types/reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

function getReminderLabel(type: ReminderType, plantName: string): { title: string; body: string } {
  switch (type) {
    case 'water':
      return { title: 'Time to water!', body: `${plantName} needs watering.` };
    case 'fertilize':
      return { title: 'Time to fertilize!', body: `${plantName} is due for fertilizer.` };
    case 'repot':
      return { title: 'Time to repot!', body: `Consider repotting ${plantName}.` };
    case 'rotate':
      return { title: 'Time to rotate!', body: `Rotate ${plantName} for even sunlight.` };
  }
}

export async function scheduleReminder(reminder: Reminder, plant: Plant): Promise<string> {
  const { title, body } = getReminderLabel(reminder.type, plant.name);

  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { reminderId: reminder.id, plantId: plant.id } },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: reminder.scheduled_at },
  });

  return id;
}

export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function reconcileNotifications(reminders: Reminder[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledIds = new Set(scheduled.map((n) => n.identifier));

  const pending = reminders.filter(
    (r) => r.completed_at === null && r.notification_id !== null
  );

  for (const reminder of pending) {
    if (reminder.notification_id && !scheduledIds.has(reminder.notification_id)) {
      // Notification fired while app was closed — mark it as needing rescheduling
      // This is surfaced to the hooks layer via the reminder having no active notification
    }
  }
}
