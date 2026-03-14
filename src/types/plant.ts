export type Plant = {
  id: string;
  name: string;
  scientific_name: string;
  photo_path: string;
  watering_schedule: string;
  light_requirements: string;
  fertilizer_guidance: string;
  common_problems: string[];
  last_watered_at: number | null;
  last_fertilized_at: number | null;
  created_at: number;
};

export type PlantIdentificationResult =
  | {
      name: string;
      scientific_name: string;
      watering_schedule: string;
      light_requirements: string;
      fertilizer_guidance: string;
      common_problems: string[];
    }
  | { error: string };

export type PlantSummary = Pick<Plant, 'id' | 'name' | 'scientific_name' | 'photo_path'>;
