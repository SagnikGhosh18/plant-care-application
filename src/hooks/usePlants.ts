import { useCallback } from 'react';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { usePlantStore } from '../store/usePlantStore';
import { useReminderStore } from '../store/useReminderStore';
import * as PlantsDB from '../db/plants';
import * as RemindersDB from '../db/reminders';
import { compressImage, imageToBase64, deleteImageFile } from '../services/imageUtils';
import { identifyPlant } from '../services/claude';
import { scheduleReminder, cancelNotification } from '../services/notifications';
import type { Plant } from '../types/plant';
import type { Reminder, ReminderType } from '../types/reminder';

function msFromNow(days: number): number {
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

function buildRemindersForPlant(plantId: string): Omit<Reminder, 'notification_id'>[] {
  const now = Date.now();
  const types: { type: ReminderType; daysFromNow: number }[] = [
    { type: 'water', daysFromNow: 3 },
    { type: 'fertilize', daysFromNow: 14 },
    { type: 'repot', daysFromNow: 365 },
    { type: 'rotate', daysFromNow: 14 },
  ];

  return types.map(({ type, daysFromNow }) => ({
    id: uuidv4(),
    plant_id: plantId,
    type,
    scheduled_at: msFromNow(daysFromNow),
    completed_at: null,
    created_at: now,
  }));
}

export function usePlants() {
  const { plants, isLoading, addPlant, updatePlant, removePlant } = usePlantStore();
  const { addReminder, updateReminder, removeRemindersForPlant } = useReminderStore();

  const addPlantFromCamera = useCallback(async (imageUri: string): Promise<void> => {
    const compressedPath = await compressImage(imageUri);
    const base64 = await imageToBase64(compressedPath);
    const result = await identifyPlant(base64);

    if ('error' in result) {
      await deleteImageFile(compressedPath);
      throw new Error(result.error);
    }

    const plant: Plant = {
      id: uuidv4(),
      name: result.name,
      scientific_name: result.scientific_name,
      photo_path: compressedPath,
      watering_schedule: result.watering_schedule,
      light_requirements: result.light_requirements,
      fertilizer_guidance: result.fertilizer_guidance,
      common_problems: result.common_problems,
      last_watered_at: null,
      last_fertilized_at: null,
      created_at: Date.now(),
    };

    await PlantsDB.insertPlant(plant);
    addPlant(plant);

    const reminderDrafts = buildRemindersForPlant(plant.id);
    for (const draft of reminderDrafts) {
      const notificationId = await scheduleReminder({ ...draft, notification_id: null }, plant);
      const reminder: Reminder = { ...draft, notification_id: notificationId };
      await RemindersDB.insertReminder(reminder);
      addReminder(reminder);
    }
  }, [addPlant, addReminder]);

  const markAsWatered = useCallback(async (plantId: string): Promise<void> => {
    const timestamp = Date.now();
    await PlantsDB.updateLastWatered(plantId, timestamp);

    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return;
    const updated: Plant = { ...plant, last_watered_at: timestamp };
    updatePlant(updated);

    const { reminders } = useReminderStore.getState();
    const waterReminder = reminders.find(
      (r) => r.plant_id === plantId && r.type === 'water'
    );
    if (waterReminder) {
      if (waterReminder.notification_id) {
        await cancelNotification(waterReminder.notification_id);
      }
      const nextScheduled = msFromNow(3);
      const newNotificationId = await scheduleReminder(
        { ...waterReminder, scheduled_at: nextScheduled, notification_id: null },
        updated
      );
      await RemindersDB.markReminderComplete(waterReminder.id, timestamp);
      await RemindersDB.updateReminderSchedule(waterReminder.id, nextScheduled, newNotificationId);
      updateReminder({ ...waterReminder, completed_at: timestamp, scheduled_at: nextScheduled, notification_id: newNotificationId });
    }
  }, [plants, updatePlant, updateReminder]);

  const markAsFertilized = useCallback(async (plantId: string): Promise<void> => {
    const timestamp = Date.now();
    await PlantsDB.updateLastFertilized(plantId, timestamp);

    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return;
    const updated: Plant = { ...plant, last_fertilized_at: timestamp };
    updatePlant(updated);

    const { reminders } = useReminderStore.getState();
    const fertilizeReminder = reminders.find(
      (r) => r.plant_id === plantId && r.type === 'fertilize'
    );
    if (fertilizeReminder) {
      if (fertilizeReminder.notification_id) {
        await cancelNotification(fertilizeReminder.notification_id);
      }
      const nextScheduled = msFromNow(14);
      const newNotificationId = await scheduleReminder(
        { ...fertilizeReminder, scheduled_at: nextScheduled, notification_id: null },
        updated
      );
      await RemindersDB.markReminderComplete(fertilizeReminder.id, timestamp);
      await RemindersDB.updateReminderSchedule(fertilizeReminder.id, nextScheduled, newNotificationId);
      updateReminder({ ...fertilizeReminder, completed_at: timestamp, scheduled_at: nextScheduled, notification_id: newNotificationId });
    }
  }, [plants, updatePlant, updateReminder]);

  const deletePlant = useCallback(async (plantId: string): Promise<void> => {
    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return;

    const { reminders } = useReminderStore.getState();
    const plantReminders = reminders.filter((r) => r.plant_id === plantId);
    for (const reminder of plantReminders) {
      if (reminder.notification_id) {
        await cancelNotification(reminder.notification_id);
      }
    }

    await PlantsDB.deletePlant(plantId);
    await deleteImageFile(plant.photo_path);
    removePlant(plantId);
    removeRemindersForPlant(plantId);
  }, [plants, removePlant, removeRemindersForPlant]);

  return { plants, isLoading, addPlantFromCamera, markAsWatered, markAsFertilized, deletePlant };
}
