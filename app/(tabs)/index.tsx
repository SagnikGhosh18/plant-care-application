import { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { usePlants } from '../../src/hooks/usePlants';
import { useReminders } from '../../src/hooks/useReminders';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import type { Plant } from '../../src/types/plant';

export default function LibraryScreen() {
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const { plants, isLoading, addPlantFromCamera } = usePlants();
  const { getMissedCount } = useReminders();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  async function handleScanPress() {
    if (!isOnline) {
      Alert.alert(
        'No connection',
        'Plant identification requires an internet connection. Your photo has not been lost — try again when you\'re back online.'
      );
      return;
    }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setCameraOpen(true);
  }

  async function handleCapture() {
    if (!cameraRef.current || scanning) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!photo) throw new Error('No photo captured');
      setCameraOpen(false);
      await addPlantFromCamera(photo.uri);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Identification failed';
      Alert.alert('Error', message);
    } finally {
      setScanning(false);
    }
  }

  async function handleGalleryPick() {
    setCameraOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    setScanning(true);
    try {
      await addPlantFromCamera(result.assets[0].uri);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Identification failed';
      Alert.alert('Error', message);
    } finally {
      setScanning(false);
    }
  }

  if (cameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setCameraOpen(false)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureButton} onPress={handleCapture} disabled={scanning}>
            {scanning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.captureInner} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryButton} onPress={handleGalleryPick} disabled={scanning}>
            <Ionicons name="images-outline" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Plant identification requires an internet connection.
          </Text>
        </View>
      )}

      {scanning && (
        <View style={styles.scanningOverlay}>
          <ActivityIndicator size="large" color="#2D6A4F" />
          <Text style={styles.scanningText}>Identifying plant...</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#2D6A4F" />
      ) : plants.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No plants yet</Text>
          <Text style={styles.emptySubtitle}>Scan a plant to add it to your library.</Text>
        </View>
      ) : (
        <FlatList
          data={plants}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }: { item: Plant }) => {
            const missedCount = getMissedCount(item.id);
            const hasWarning = missedCount > 3;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/plant/${item.id}`)}
              >
                <Image source={{ uri: item.photo_path }} style={styles.cardImage} />
                {hasWarning && (
                  <View style={styles.warningBadge}>
                    <Ionicons name="warning" size={14} color="#fff" />
                  </View>
                )}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cardScientific} numberOfLines={1}>{item.scientific_name}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
        <Text style={styles.scanButtonText}>+ Scan Plant</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9F7' },
  offlineBanner: {
    backgroundColor: '#FFF3CD',
    padding: 10,
    alignItems: 'center',
  },
  offlineBannerText: { color: '#856404', fontSize: 13 },
  loader: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#777', textAlign: 'center' },
  grid: { padding: 12 },
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardImage: { width: '100%', height: 130 },
  warningBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#E67E22',
    borderRadius: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { padding: 8 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#222' },
  cardScientific: { fontSize: 11, color: '#777', marginTop: 2, fontStyle: 'italic' },
  scanButton: {
    margin: 16,
    backgroundColor: '#2D6A4F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  scanButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cancelButton: {
    position: 'absolute',
    left: 24,
    bottom: 0,
    padding: 12,
  },
  galleryButton: {
    position: 'absolute',
    right: 24,
    bottom: 0,
    padding: 12,
  },
  cancelButtonText: { color: '#fff', fontSize: 16 },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scanningText: { marginTop: 12, fontSize: 16, color: '#2D6A4F' },
});
