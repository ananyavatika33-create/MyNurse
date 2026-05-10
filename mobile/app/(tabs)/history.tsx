import { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getConversations, deleteConversation } from '@/lib/storage';
import { Conversation, Message } from '@/lib/types';
import { AppColors, Spacing, Radius, FontSize } from '@/constants/theme';

const OUTCOME_COLORS: Record<string, string> = {
  emergency: AppColors.emergency,
  high_severity: AppColors.warning,
  monitor: AppColors.primary,
  unknown: AppColors.textMuted,
};

function groupByDate(convs: Conversation[]) {
  const groups: { label: string; items: Conversation[] }[] = [];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const map = new Map<string, Conversation[]>();
  for (const c of convs) {
    const d = new Date(c.createdAt);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(c);
  }
  for (const [label, items] of map.entries()) {
    groups.push({ label, items });
  }
  return groups;
}

export default function HistoryScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);

  useFocusEffect(
    useCallback(() => {
      getConversations().then(setConversations);
    }, [])
  );

  function confirmDelete(id: string) {
    Alert.alert('Delete Conversation', 'Remove this conversation from your history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteConversation(id);
          setConversations(prev => prev.filter(c => c.id !== id));
          if (selected?.id === id) setSelected(null);
        },
      },
    ]);
  }

  const groups = groupByDate(conversations);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.background }} edges={['top']}>
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Chat History</Text>

        {conversations.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubble-outline" size={40} color={AppColors.textMuted} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyBody}>
              Your chats with MyNurse will be saved here automatically.
            </Text>
          </View>
        ) : (
          groups.map(group => (
            <View key={group.label}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map(conv => (
                <TouchableOpacity
                  key={conv.id}
                  style={styles.card}
                  onPress={() => setSelected(conv)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardLeft}>
                    <View
                      style={[
                        styles.outcomeDot,
                        { backgroundColor: OUTCOME_COLORS[conv.safetyOutcome] ?? AppColors.textMuted },
                      ]}
                    />
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{conv.title}</Text>
                      <Text style={styles.cardMeta}>
                        {conv.messages.length} messages ·{' '}
                        {new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => confirmDelete(conv.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={16} color={AppColors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="chevron-down" size={24} color={AppColors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle} numberOfLines={1}>{selected.title}</Text>
              <TouchableOpacity onPress={() => confirmDelete(selected.id)}>
                <Ionicons name="trash-outline" size={20} color={AppColors.emergency} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDate}>
              {new Date(selected.createdAt).toLocaleString()}
            </Text>
            <ScrollView contentContainerStyle={styles.modalMessages}>
              {selected.messages.map(msg => (
                <ConversationMessage key={msg.id} message={msg} />
              ))}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
    </SafeAreaView>
  );
}

function ConversationMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[msgStyles.row, isUser ? msgStyles.rowUser : msgStyles.rowAssistant]}>
      {!isUser && (
        <View style={msgStyles.avatar}>
          <Ionicons name="medical" size={12} color="#fff" />
        </View>
      )}
      <View style={[msgStyles.bubble, isUser ? msgStyles.bubbleUser : msgStyles.bubbleAssistant]}>
        {message.content.split('\n').map((line, i) => {
          const clean = line.replace(/\*\*/g, '');
          if (!clean.trim()) return <View key={i} style={{ height: 3 }} />;
          const isHeading = line.endsWith(':') && line.length < 50 && !line.startsWith('•') && !line.startsWith('—');
          return (
            <Text
              key={i}
              style={[
                msgStyles.text,
                isUser && msgStyles.textUser,
                isHeading && msgStyles.heading,
              ]}
            >
              {clean}
            </Text>
          );
        })}
        <Text style={[msgStyles.time, isUser && msgStyles.timeUser]}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

const msgStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: Spacing.sm },
  rowUser: { flexDirection: 'row-reverse' },
  rowAssistant: {},
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: { maxWidth: '82%', borderRadius: Radius.lg, padding: Spacing.sm },
  bubbleUser: { backgroundColor: AppColors.primary, borderBottomRightRadius: 4 },
  bubbleAssistant: {
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderBottomLeftRadius: 4,
  },
  text: { fontSize: FontSize.sm, color: AppColors.text, lineHeight: 20 },
  textUser: { color: '#fff' },
  heading: { fontWeight: '700', marginTop: 4 },
  time: { fontSize: 10, color: AppColors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  timeUser: { color: 'rgba(255,255,255,0.7)' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: AppColors.text, marginBottom: Spacing.md },
  groupLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: AppColors.textMuted,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  outcomeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '600', color: AppColors.text },
  cardMeta: { fontSize: FontSize.xs, color: AppColors.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '600', color: AppColors.text },
  emptyBody: { fontSize: FontSize.sm, color: AppColors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.lg },
  modal: { flex: 1, backgroundColor: AppColors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    backgroundColor: AppColors.surface,
  },
  modalTitle: { flex: 1, fontSize: FontSize.md, fontWeight: '700', color: AppColors.text },
  modalDate: { fontSize: FontSize.xs, color: AppColors.textMuted, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  modalMessages: { padding: Spacing.md, paddingBottom: Spacing.xl },
});
