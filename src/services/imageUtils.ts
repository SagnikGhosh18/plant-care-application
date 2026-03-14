import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

const PLANTS_DIR = `${FileSystem.documentDirectory}plants/`;
const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.7;

async function ensurePlantsDirExists(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PLANTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PLANTS_DIR, { intermediates: true });
  }
}

export async function compressImage(uri: string): Promise<string> {
  await ensurePlantsDirExists();

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

  const filename = `${Date.now()}.jpg`;
  const destPath = `${PLANTS_DIR}${filename}`;
  await FileSystem.moveAsync({ from: result.uri, to: destPath });

  return destPath;
}

export async function imageToBase64(path: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(path, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}

export async function deleteImageFile(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}
