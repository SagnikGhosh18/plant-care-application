import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useReminders } from '../../src/hooks/useReminders';
import { usePlantStore } from '../../src/store/usePlantStore';
import type { Reminder } from '../../src/types/reminder';

const TYPE_LABELS: Record<string, string> = {
  water: 'Water',
  fertilize: 'Fertilize',
  repot: 'Repot',
  rotate: 'Rotate',
};

function formatDueDate(ts: number): string {
  const now = Date.now();
  const diff = ts - now;
  const days = Math.round(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export default function RemindersScreen() {
  const { reminders, isLoading, completeReminder } = useReminders();
  const plants = usePlantStore((s) => s.plants);

  function getPlantName(plantId: string): string {
    return plants.find((p) => p.id === plantId)?.name ?? 'Unknown Plant';
  }

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} size="large" color="#2D6A4F" />;
  }

  return (
    <View style={styles.container}>
      {reminders.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>No pending reminders.</Text>
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: Reminder }) => {
            const dueLabel = formatDueDate(item.scheduled_at);
            const isOverdue = item.scheduled_at < Date.now();

            return (
              <View style={styles.card}>
                <View style={styles.cardLeft}>
                  <Text style={styles.typeLabel}>{TYPE_LABELS[item.type] ?? item.type}</Text>
                  <Text style={styles.plantName}>{getPlantName(item.plant_id)}</Text>
                  <Text style={[styles.dueDate, isOverdue && styles.overdue]}>{dueLabel}</Text>
                </View>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={() => completeReminder(item.id)}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9F7' },
  loader: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#777' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  cardLeft: { flex: 1 },
  typeLabel: { fontSize: 13, color: '#2D6A4F', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  plantName: { fontSize: 16, fontWeight: '600', color: '#222', marginTop: 2 },
  dueDate: { fontSize: 13, color: '#666', marginTop: 4 },
  overdue: { color: '#C0392B', fontWeight: '600' },
  doneButton: {
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  doneButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
