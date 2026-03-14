import { getDatabase } from './schema';
import type { Reminder, ReminderType } from '../types/reminder';

type ReminderRow = {
  id: string;
  plant_id: string;
  type: ReminderType;
  scheduled_at: number;
  completed_at: number | null;
  notification_id: string | null;
  created_at: number;
};

function rowToReminder(row: ReminderRow): Reminder {
  return row;
}

export async function insertReminder(reminder: Reminder): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO reminders (id, plant_id, type, scheduled_at, completed_at, notification_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      reminder.id,
      reminder.plant_id,
      reminder.type,
      reminder.scheduled_at,
      reminder.completed_at ?? null,
      reminder.notification_id ?? null,
      reminder.created_at,
    ]
  );
}

export async function getAllReminders(): Promise<Reminder[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ReminderRow>(
    'SELECT * FROM reminders ORDER BY scheduled_at ASC'
  );
  return rows.map(rowToReminder);
}

export async function getRemindersForPlant(plantId: string): Promise<Reminder[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<ReminderRow>(
    'SELECT * FROM reminders WHERE plant_id = ? ORDER BY scheduled_at ASC',
    [plantId]
  );
  return rows.map(rowToReminder);
}

export async function markReminderComplete(id: string, completedAt: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('UPDATE reminders SET completed_at = ? WHERE id = ?', [completedAt, id]);
}

export async function updateReminderSchedule(
  id: string,
  scheduledAt: number,
  notificationId: string
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'UPDATE reminders SET scheduled_at = ?, notification_id = ? WHERE id = ?',
    [scheduledAt, notificationId, id]
  );
}

export async function deleteRemindersForPlant(plantId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM reminders WHERE plant_id = ?', [plantId]);
}
