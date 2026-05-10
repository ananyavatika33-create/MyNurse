export type SafetyOutcome = 'emergency' | 'high_severity' | 'monitor' | 'unknown';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  safetyOutcome: SafetyOutcome;
  createdAt: string;
  updatedAt: string;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  notes: string;
  active: boolean;
  createdAt: string;
}

export interface UserProfile {
  firstName: string;
  age: string;
  weight: string;
  weightUnit: 'kg' | 'lbs';
  sex: string;
  diet: string;
  conditions: string;
  medications: string;
  allergies: string;
}
