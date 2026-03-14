import { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePlantStore } from '../../src/store/usePlantStore';
import { usePlants } from '../../src/hooks/usePlants';

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === id));
  const { markAsWatered, markAsFertilized, deletePlant } = usePlants();
  const [loading, setLoading] = useState<'water' | 'fertilize' | 'delete' | null>(null);

  if (!plant) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Plant not found.</Text>
      </View>
    );
  }

  async function handleWater() {
    setLoading('water');
    try {
      await markAsWatered(plant!.id);
    } finally {
      setLoading(null);
    }
  }

  async function handleFertilize() {
    setLoading('fertilize');
    try {
      await markAsFertilized(plant!.id);
    } finally {
      setLoading(null);
    }
  }

  function handleDelete() {
    Alert.alert('Delete Plant', `Remove ${plant!.name} from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setLoading('delete');
          try {
            await deletePlant(plant!.id);
            router.back();
          } finally {
            setLoading(null);
          }
        },
      },
    ]);
  }

  function formatDate(ts: number | null): string {
    if (!ts) return 'Never';
    return new Date(ts).toLocaleDateString();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: plant.photo_path }} style={styles.photo} />

      <View style={styles.section}>
        <Text style={styles.name}>{plant.name}</Text>
        <Text style={styles.scientific}>{plant.scientific_name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Care Guide</Text>
        <InfoRow label="Watering" value={plant.watering_schedule} />
        <InfoRow label="Light" value={plant.light_requirements} />
        <InfoRow label="Fertilizer" value={plant.fertilizer_guidance} />
      </View>

      {plant.common_problems.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Common Problems</Text>
          {plant.common_problems.map((problem, i) => (
            <Text key={i} style={styles.problem}>• {problem}</Text>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plant History</Text>
        <InfoRow label="Last watered" value={formatDate(plant.last_watered_at)} />
        <InfoRow label="Last fertilized" value={formatDate(plant.last_fertilized_at)} />
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.waterButton]}
          onPress={handleWater}
          disabled={loading !== null}
        >
          {loading === 'water' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>Mark as Watered</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.fertilizeButton]}
          onPress={handleFertilize}
          disabled={loading !== null}
        >
          {loading === 'fertilize' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>Mark as Fertilized</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        disabled={loading !== null}
      >
        {loading === 'delete' ? (
          <ActivityIndicator color="#C0392B" />
        ) : (
          <Text style={styles.deleteButtonText}>Delete Plant</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9F7' },
  content: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFound: { color: '#777', fontSize: 16 },
  photo: { width: '100%', height: 260 },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  name: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  scientific: { fontSize: 15, color: '#777', fontStyle: 'italic', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#2D6A4F', marginBottom: 12 },
  infoRow: { marginBottom: 10 },
  infoLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, color: '#333', marginTop: 2 },
  problem: { fontSize: 14, color: '#444', marginBottom: 6, lineHeight: 20 },
  actions: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  waterButton: { backgroundColor: '#1A759F' },
  fertilizeButton: { backgroundColor: '#40916C' },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  deleteButton: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C0392B',
  },
  deleteButtonText: { color: '#C0392B', fontWeight: '600', fontSize: 14 },
});
