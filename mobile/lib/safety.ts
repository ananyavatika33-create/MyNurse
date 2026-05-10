import { SafetyOutcome } from './types';

const EMERGENCY_TERMS = [
  'chest pain',
  'chest pressure',
  'shortness of breath',
  'trouble breathing',
  "can't breathe",
  'cannot breathe',
  'severe bleeding',
  'heavy bleeding',
  'stroke',
  'face drooping',
  'weakness on one side',
  'one-sided weakness',
  'seizure',
  'passed out',
  'fainted',
  'fainting',
  'suicidal',
  'suicide',
  'self-harm',
  'anaphylaxis',
  'severe allergic reaction',
  'throat swelling',
  'lips swelling',
  'tongue swelling',
  'blue lips',
  'worst headache',
  'severe abdominal pain',
];

export function hasEmergencyRedFlag(text: string): boolean {
  const lower = text.toLowerCase();
  return EMERGENCY_TERMS.some(term => lower.includes(term));
}

export function evaluateSafety(
  symptom: string,
  severity: number,
  notes = '',
  associated = ''
): SafetyOutcome {
  const combined = `${symptom} ${notes} ${associated}`;
  if (hasEmergencyRedFlag(combined)) return 'emergency';
  if (severity >= 8) return 'high_severity';
  if (severity >= 5) return 'monitor';
  return 'unknown';
}

export const EMERGENCY_GUIDANCE = `Your symptom may be a medical emergency.

Please seek urgent medical care immediately or call emergency services (911 or your local emergency number).

Do not wait — symptoms like chest pain, trouble breathing, stroke signs, severe bleeding, or severe allergic reactions need immediate evaluation.

This app cannot handle emergencies. Please call for help now.`;
