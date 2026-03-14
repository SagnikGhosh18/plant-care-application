import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { usePlantStore } from '../../src/store/usePlantStore';
import { chatWithBotanist } from '../../src/services/claude';
import { compressImage, imageToBase64 } from '../../src/services/imageUtils';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import type { ChatMessage } from '../../src/types/chat';
import type { Plant } from '../../src/types/plant';
import * as ImagePicker from 'expo-image-picker';

function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((dots.length - i) * 150),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.typingBubble}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.typingDot,
            { opacity: dot, transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }] },
          ]}
        />
      ))}
    </View>
  );
}

export default function BotanistScreen() {
  const isOnline = useNetworkStatus();
  const plants = usePlantStore((s) => s.plants);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [sending, setSending] = useState(false);
  const [showPlantPicker, setShowPlantPicker] = useState(false);
  const listRef = useRef<FlatList>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending || !isOnline) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const reply = await chatWithBotanist(nextMessages, selectedPlant ?? undefined);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setSending(false);
    }
  }

  async function handleAttachImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets[0]) return;

    const compressed = await compressImage(result.assets[0].uri);
    const base64 = await imageToBase64(compressed);
    const text = input.trim() || 'What can you tell me about this?';

    const userMessage: ChatMessage = { role: 'user', content: text, imageBase64: base64 };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const reply = await chatWithBotanist(nextMessages, selectedPlant ?? undefined);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Chatting with the botanist requires an internet connection.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.plantSelector}
        onPress={() => setShowPlantPicker(true)}
      >
        <Text style={styles.plantSelectorText}>
          {selectedPlant ? `Context: ${selectedPlant.name}` : 'No plant selected (tap to choose)'}
        </Text>
      </TouchableOpacity>

      {showPlantPicker && (
        <View style={styles.plantPickerSheet}>
          <TouchableOpacity
            style={styles.plantPickerOption}
            onPress={() => { setSelectedPlant(null); setShowPlantPicker(false); }}
          >
            <Text style={styles.plantPickerOptionText}>No plant context</Text>
          </TouchableOpacity>
          {plants.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.plantPickerOption}
              onPress={() => { setSelectedPlant(p); setShowPlantPicker(false); }}
            >
              <Text style={styles.plantPickerOptionText}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.bubbleText, item.role === 'user' ? styles.userText : styles.aiText]}>
              {item.content}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>Ask the botanist anything about your plants.</Text>
          </View>
        }
        ListFooterComponent={sending ? <TypingIndicator /> : null}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handleAttachImage}
          disabled={!isOnline || sending}
        >
          <Text style={styles.attachButtonText}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={isOnline ? 'Ask the botanist...' : 'Offline'}
          editable={isOnline && !sending}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!isOnline || sending || !input.trim()) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!isOnline || sending || !input.trim()}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9F7' },
  offlineBanner: { backgroundColor: '#FFF3CD', padding: 10, alignItems: 'center' },
  offlineBannerText: { color: '#856404', fontSize: 13 },
  plantSelector: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#C8E6C9',
  },
  plantSelectorText: { color: '#2D6A4F', fontSize: 13 },
  plantPickerSheet: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    maxHeight: 200,
  },
  plantPickerOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  plantPickerOptionText: { fontSize: 15, color: '#333' },
  messageList: { padding: 16, paddingBottom: 8 },
  emptyChat: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyChatText: { color: '#aaa', fontSize: 14, textAlign: 'center' },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#2D6A4F', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  aiText: { color: '#222' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  attachButton: { padding: 8 },
  attachButtonText: { fontSize: 20 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: '#fafafa',
  },
  sendButton: {
    backgroundColor: '#2D6A4F',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButtonDisabled: { backgroundColor: '#aaa' },
  sendButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 5,
    elevation: 1,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#999',
  },
});
