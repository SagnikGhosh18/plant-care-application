import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { initDatabase } from '../src/db/schema';
import { getAllPlants } from '../src/db/plants';
import { getAllReminders } from '../src/db/reminders';
import { usePlantStore } from '../src/store/usePlantStore';
import { useReminderStore } from '../src/store/useReminderStore';
import { requestPermissions, reconcileNotifications } from '../src/services/notifications';

export default function RootLayout() {
  const setPlants = usePlantStore((s) => s.setPlants);
  const setReminders = useReminderStore((s) => s.setReminders);

  useEffect(() => {
    async function bootstrap() {
      await initDatabase();
      await requestPermissions();

      const [plants, reminders] = await Promise.all([getAllPlants(), getAllReminders()]);
      setPlants(plants);
      setReminders(reminders);

      await reconcileNotifications(reminders);
    }

    bootstrap().catch(console.error);
  }, [setPlants, setReminders]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="plant/[id]" options={{ title: 'Plant Detail', headerBackTitle: 'Library' }} />
    </Stack>
  );
}
