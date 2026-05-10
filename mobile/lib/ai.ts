import { UserProfile, Message } from './types';
import { hasEmergencyRedFlag, EMERGENCY_GUIDANCE } from './safety';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function sendAIMessage(
  conversationMessages: Message[],
  profile: UserProfile | null
): Promise<string | null> {
  if (!API_URL) return null;

  const lastUserMsg = conversationMessages.filter(m => m.role === 'user').pop();
  if (lastUserMsg && hasEmergencyRedFlag(lastUserMsg.content)) {
    return EMERGENCY_GUIDANCE;
  }

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversationMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        profile: profile ?? null,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.content ?? null;
  } catch (e) {
    console.warn('AI call failed:', e);
    return null;
  }
}
