import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getProfile, saveConversation } from '@/lib/storage';
import { Message, Conversation, UserProfile } from '@/lib/types';
import { ChatState, getInitialState, getGreeting, processMessage } from '@/lib/chatbot';
import { sendAIMessage } from '@/lib/ai';
import { AppColors, Spacing, Radius, FontSize } from '@/constants/theme';

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function makeMessage(role: 'user' | 'assistant', content: string): Message {
  return { id: uid(), role, content, timestamp: new Date().toISOString() };
}

export default function ChatScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatState, setChatState] = useState<ChatState>(getInitialState());
  const [conversationId] = useState(uid());
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const aiEnabled = !!process.env.EXPO_PUBLIC_API_URL;
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      getProfile().then(p => {
        setProfile(p);
        const greeting = makeMessage('assistant', getGreeting(p));
        setMessages([greeting]);
        setChatState(getInitialState());
      });
    }, [])
  );

  useEffect(() => {
    const timer = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      100
    );
    return () => clearTimeout(timer);
  }, [messages, thinking]);

  async function persistConversation(msgs: Message[], state: ChatState) {
    if (msgs.filter(m => m.role === 'user').length === 0) return;
    const firstUserMsg = msgs.find(m => m.role === 'user');
    const conv: Conversation = {
      id: conversationId,
      title: firstUserMsg?.content.slice(0, 60) ?? 'Health conversation',
      messages: msgs,
      safetyOutcome: state.safetyOutcome,
      createdAt: msgs[0]?.timestamp ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveConversation(conv);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    Keyboard.dismiss();

    const userMsg = makeMessage('user', text);
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setThinking(true);

    let responseContent: string;
    let newState = chatState;

    if (aiEnabled) {
      // AI path — send full conversation to OpenAI
      const aiResponse = await sendAIMessage(newMessages, profile);
      if (aiResponse) {
        responseContent = aiResponse;
        // Update state minimally so emergency detection still works
        newState = { ...chatState, step: 'guidance_given' };
      } else {
        // AI failed — fall back to rule-based
        const result = processMessage(text, chatState, profile);
        responseContent = result.content;
        newState = result.newState;
      }
    } else {
      // Rule-based path
      await new Promise(r => setTimeout(r, 500));
      const result = processMessage(text, chatState, profile);
      responseContent = result.content;
      newState = result.newState;
    }

    setChatState(newState);
    const assistantMsg = makeMessage('assistant', responseContent);
    const finalMessages = [...newMessages, assistantMsg];
    setMessages(finalMessages);
    setThinking(false);
    persistConversation(finalMessages, newState);
  }

  function startNewChat() {
    Keyboard.dismiss();
    const greeting = makeMessage('assistant', getGreeting(profile));
    setMessages([greeting]);
    setChatState(getInitialState());
    setInput('');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.topBarTitle}>MyNurse</Text>
            {aiEnabled && (
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.newChatBtn} onPress={startNewChat}>
            <Ionicons name="add" size={18} color={AppColors.primary} />
            <Text style={styles.newChatText}>New Chat</Text>
          </TouchableOpacity>
        </View>

        <Pressable style={styles.messagesWrapper} onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {thinking && <TypingIndicator />}
          </ScrollView>
        </Pressable>

        {!aiEnabled && (
          <View style={styles.noAiBanner}>
            <Ionicons name="flash-outline" size={13} color={AppColors.warning} />
            <Text style={styles.noAiText}>
              Add an OpenAI key in Profile to enable AI responses
            </Text>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Describe your symptom or ask a question..."
            placeholderTextColor={AppColors.textMuted}
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!input.trim() || thinking) && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || thinking}
          >
            {thinking ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.disclaimerBar}>
          <Text style={styles.disclaimer}>
            Not a substitute for professional medical care
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const lines = message.content.split('\n');

  return (
    <View style={[bubbleStyles.row, isUser ? bubbleStyles.rowUser : bubbleStyles.rowAssistant]}>
      {!isUser && (
        <View style={bubbleStyles.avatar}>
          <Ionicons name="medical" size={13} color="#fff" />
        </View>
      )}
      <View style={[bubbleStyles.bubble, isUser ? bubbleStyles.bubbleUser : bubbleStyles.bubbleAssistant]}>
        {lines.map((line, i) => {
          const isDivider = line.trim() === '---';
          const cleaned = line.replace(/\*\*/g, '');
          const isHeading =
            !isDivider &&
            !line.startsWith('•') &&
            !line.startsWith('—') &&
            !line.startsWith('-') &&
            line.trim().endsWith(':') &&
            line.trim().length < 55;

          if (isDivider) return <View key={i} style={bubbleStyles.divider} />;
          if (!cleaned.trim()) return <View key={i} style={{ height: 4 }} />;

          return (
            <Text
              key={i}
              style={[
                bubbleStyles.text,
                isUser && bubbleStyles.textUser,
                isHeading && bubbleStyles.heading,
              ]}
            >
              {cleaned}
            </Text>
          );
        })}
        <Text style={[bubbleStyles.time, isUser && bubbleStyles.timeUser]}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={bubbleStyles.row}>
      <View style={bubbleStyles.avatar}>
        <Ionicons name="medical" size={13} color="#fff" />
      </View>
      <View style={[bubbleStyles.bubble, bubbleStyles.bubbleAssistant, { paddingVertical: 14, paddingHorizontal: 16 }]}>
        <ActivityIndicator size="small" color={AppColors.textMuted} />
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  rowUser: { flexDirection: 'row-reverse' },
  rowAssistant: {},
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  bubbleUser: {
    backgroundColor: AppColors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: AppColors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  text: {
    fontSize: FontSize.sm,
    color: AppColors.text,
    lineHeight: 21,
  },
  textUser: { color: '#fff' },
  heading: { fontWeight: '700', marginTop: 6 },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: Spacing.sm,
  },
  time: {
    fontSize: 10,
    color: AppColors.textMuted,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeUser: { color: 'rgba(255,255,255,0.65)' },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AppColors.surface },
  container: { flex: 1, backgroundColor: AppColors.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surface,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  topBarTitle: { fontSize: FontSize.lg, fontWeight: '700', color: AppColors.text },
  aiBadge: {
    backgroundColor: AppColors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  newChatText: { fontSize: FontSize.sm, color: AppColors.primary, fontWeight: '500' },
  messagesWrapper: { flex: 1 },
  messages: { flex: 1 },
  messagesContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  noAiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppColors.warningLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: AppColors.warningBorder,
  },
  noAiText: { fontSize: FontSize.xs, color: AppColors.warning, flex: 1 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    backgroundColor: AppColors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: FontSize.md,
    color: AppColors.text,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: AppColors.textMuted },
  disclaimerBar: {
    backgroundColor: AppColors.surface,
    paddingBottom: 4,
    alignItems: 'center',
  },
  disclaimer: {
    fontSize: 10,
    color: AppColors.textMuted,
    paddingBottom: 4,
  },
});
