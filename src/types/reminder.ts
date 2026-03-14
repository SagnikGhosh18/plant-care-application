export type ReminderType = 'water' | 'fertilize' | 'repot' | 'rotate';

export type Reminder = {
  id: string;
  plant_id: string;
  type: ReminderType;
  scheduled_at: number;
  completed_at: number | null;
  notification_id: string | null;
  created_at: number;
};
