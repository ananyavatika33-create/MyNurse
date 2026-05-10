import AsyncStorage from '@react-native-async-storage/async-storage';
import { Conversation, Medication, UserProfile } from './types';

const KEYS = {
  conversations: 'conversations_v2',
  medications: 'medications_v1',
  profile: 'profile_v2',
};

// Conversations
export async function getConversations(): Promise<Conversation[]> {
  const raw = await AsyncStorage.getItem(KEYS.conversations);
  return raw ? JSON.parse(raw) : [];
}

export async function saveConversation(conv: Conversation): Promise<void> {
  const existing = await getConversations();
  const idx = existing.findIndex(c => c.id === conv.id);
  const updated =
    idx >= 0 ? existing.map(c => (c.id === conv.id ? conv : c)) : [conv, ...existing];
  await AsyncStorage.setItem(KEYS.conversations, JSON.stringify(updated));
}

export async function deleteConversation(id: string): Promise<void> {
  const existing = await getConversations();
  await AsyncStorage.setItem(
    KEYS.conversations,
    JSON.stringify(existing.filter(c => c.id !== id))
  );
}

// Medications
export async function getMedications(): Promise<Medication[]> {
  const raw = await AsyncStorage.getItem(KEYS.medications);
  return raw ? JSON.parse(raw) : [];
}

export async function saveMedication(med: Medication): Promise<void> {
  const existing = await getMedications();
  const idx = existing.findIndex(m => m.id === med.id);
  const updated =
    idx >= 0 ? existing.map(m => (m.id === med.id ? med : m)) : [med, ...existing];
  await AsyncStorage.setItem(KEYS.medications, JSON.stringify(updated));
}

export async function deleteMedication(id: string): Promise<void> {
  const existing = await getMedications();
  await AsyncStorage.setItem(
    KEYS.medications,
    JSON.stringify(existing.filter(m => m.id !== id))
  );
}

// Profile
export async function getProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(KEYS.profile);
  return raw ? JSON.parse(raw) : null;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
}
