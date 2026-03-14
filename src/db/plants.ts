import { getDatabase } from './schema';
import type { Plant } from '../types/plant';

type PlantRow = {
  id: string;
  name: string;
  scientific_name: string;
  photo_path: string;
  watering_schedule: string;
  light_requirements: string;
  fertilizer_guidance: string;
  common_problems: string;
  last_watered_at: number | null;
  last_fertilized_at: number | null;
  created_at: number;
};

function rowToPlant(row: PlantRow): Plant {
  return {
    ...row,
    common_problems: JSON.parse(row.common_problems) as string[],
  };
}

export async function insertPlant(plant: Plant): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO plants
      (id, name, scientific_name, photo_path, watering_schedule, light_requirements,
       fertilizer_guidance, common_problems, last_watered_at, last_fertilized_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      plant.id,
      plant.name,
      plant.scientific_name,
      plant.photo_path,
      plant.watering_schedule,
      plant.light_requirements,
      plant.fertilizer_guidance,
      JSON.stringify(plant.common_problems),
      plant.last_watered_at ?? null,
      plant.last_fertilized_at ?? null,
      plant.created_at,
    ]
  );
}

export async function getAllPlants(): Promise<Plant[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<PlantRow>('SELECT * FROM plants ORDER BY created_at DESC');
  return rows.map(rowToPlant);
}

export async function getPlantById(id: string): Promise<Plant | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<PlantRow>('SELECT * FROM plants WHERE id = ?', [id]);
  return row ? rowToPlant(row) : null;
}

export async function updateLastWatered(id: string, timestamp: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('UPDATE plants SET last_watered_at = ? WHERE id = ?', [timestamp, id]);
}

export async function updateLastFertilized(id: string, timestamp: number): Promise<void> {
  const db = getDatabase();
  await db.runAsync('UPDATE plants SET last_fertilized_at = ? WHERE id = ?', [timestamp, id]);
}

export async function deletePlant(id: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync('DELETE FROM plants WHERE id = ?', [id]);
}
