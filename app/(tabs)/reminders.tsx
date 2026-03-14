import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useReminders } from '../../src/hooks/useReminders';
import { usePlantStore } from '../../src/store/usePlantStore';
import type { Reminder } from '../../src/types/reminder';
import type { Plant } from '../../src/types/plant';

const TYPE_LABELS: Record<string, string> = {
  water: 'Water',
  fertilize: 'Fertilize',
  repot: 'Repot',
  rotate: 'Rotate',
};

function isTodayOrOverdue(ts: number): boolean {
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  return ts < todayEnd;
}

function formatDueLabel(ts: number): string {
  const now = Date.now();
  const diff = ts - now;
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

function groupByType(items: Reminder[]): [string, Reminder[]][] {
  const groups: Record<string, Reminder[]> = {};
  for (const r of items) {
    if (!groups[r.type]) groups[r.type] = [];
    groups[r.type].push(r);
  }
  return Object.entries(groups);
}

function ReminderCard({
  reminder,
  plant,
  isCompleting,
  onComplete,
  onPress,
}: {
  reminder: Reminder;
  plant: Plant | undefined;
  isCompleting: boolean;
  onComplete: (id: string) => void;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, isCompleting && styles.cardCompleting]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {isCompleting && (
        <View style={styles.doneBadge}>
          <Text style={styles.doneBadgeText}>Done!</Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.checkbox, isCompleting && styles.checkboxChecked]}
        onPress={() => !isCompleting && onComplete(reminder.id)}
        activeOpacity={0.7}
      >
        {isCompleting && <Ionicons name="checkmark" size={18} color="#fff" />}
      </TouchableOpacity>
      <View style={styles.cardContent}>
        <Text style={styles.plantName}>{plant?.name ?? 'Unknown Plant'}</Text>
        <Text style={styles.cardSubtitle}>{formatDueLabel(reminder.scheduled_at)}</Text>
      </View>
      {plant?.photo_path ? (
        <Image source={{ uri: plant.photo_path }} style={styles.plantPhoto} />
      ) : (
        <View style={[styles.plantPhoto, styles.plantPhotoPlaceholder]}>
          <Ionicons name="leaf" size={24} color="#2D6A4F" />
        </View>
      )}
    </TouchableOpacity>
  );
}

function ReminderSection({
  title,
  groups,
  plants,
  completingIds,
  onComplete,
  onPressPlant,
}: {
  title: string;
  groups: [string, Reminder[]][];
  plants: Plant[];
  completingIds: Set<string>;
  onComplete: (id: string) => void;
  onPressPlant: (plantId: string) => void;
}) {
  if (groups.length === 0) return null;
  const getPlant = (id: string) => plants.find((p) => p.id === id);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {groups.map(([type, items]) => (
        <View key={type}>
          <Text style={styles.typeHeader}>{TYPE_LABELS[type] ?? type}</Text>
          {items.map((item) => (
            <ReminderCard
              key={item.id}
              reminder={item}
              plant={getPlant(item.plant_id)}
              isCompleting={completingIds.has(item.id)}
              onComplete={onComplete}
              onPress={() => onPressPlant(item.plant_id)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function RemindersScreen() {
  const { reminders, isLoading, completeReminder } = useReminders();
  const plants = usePlantStore((s) => s.plants);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());

  const handleComplete = useCallback(
    (reminderId: string) => {
      setCompletingIds((prev) => new Set(prev).add(reminderId));
      setTimeout(async () => {
        await completeReminder(reminderId);
        setCompletingIds((prev) => {
          const next = new Set(prev);
          next.delete(reminderId);
          return next;
        });
      }, 600);
    },
    [completeReminder],
  );

  const todayReminders = reminders.filter((r) => isTodayOrOverdue(r.scheduled_at));
  const upcomingReminders = reminders.filter((r) => !isTodayOrOverdue(r.scheduled_at));
  const todayGroups = groupByType(todayReminders);
  const upcomingGroups = groupByType(upcomingReminders);

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} size="large" color="#2D6A4F" />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Today's <Text style={styles.headerBold}>Tasks</Text>
        </Text>
        <Text style={styles.headerSubtitle}>
          Complete your today's tasks &{'\n'}keep your plants alive
        </Text>
      </View>

      {reminders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={64} color="#2D6A4F" />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>No pending reminders.</Text>
        </View>
      ) : (
        <>
          <ReminderSection
            title="Today"
            groups={todayGroups}
            plants={plants}
            completingIds={completingIds}
            onComplete={handleComplete}
            onPressPlant={(plantId) => router.push(`/plant/${plantId}`)}
          />
          <ReminderSection
            title="Upcoming"
            groups={upcomingGroups}
            plants={plants}
            completingIds={completingIds}
            onComplete={handleComplete}
            onPressPlant={(plantId) => router.push(`/plant/${plantId}`)}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F9F7',
  },
  content: {
    paddingBottom: 32,
  },
  loader: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    color: '#1A1A1A',
  },
  headerBold: {
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  typeHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    marginTop: 12,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardCompleting: {
    backgroundColor: '#F0FAF4',
  },
  doneBadge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 64,
    backgroundColor: '#2D6A4F',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  doneBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2D6A4F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
    marginLeft: 58,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  plantPhoto: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginLeft: 8,
  },
  plantPhotoPlaceholder: {
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#777',
  },
});
