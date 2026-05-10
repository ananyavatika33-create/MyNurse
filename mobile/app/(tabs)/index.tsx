import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getConversations, getProfile, getMedications } from '@/lib/storage';
import { Conversation, UserProfile, Medication } from '@/lib/types';
import { AppColors, Spacing, Radius, FontSize } from '@/constants/theme';

const OUTCOME_COLORS: Record<string, string> = {
  emergency: AppColors.emergency,
  high_severity: AppColors.warning,
  monitor: AppColors.primary,
  unknown: AppColors.textMuted,
};

export default function HomeScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentConvs, setRecentConvs] = useState<Conversation[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getProfile(), getConversations(), getMedications()]).then(([p, c, m]) => {
        setProfile(p);
        setRecentConvs(c.slice(0, 3));
        setMedications(m.filter(med => med.active));
      });
    }, [])
  );

  const greeting = profile?.firstName ? `Hi, ${profile.firstName}` : 'Hi there';
  const hasProfile = !!(profile?.age || profile?.conditions || profile?.medications);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.background }} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.tagline}>Your personal health companion</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/setup')}>
          <Ionicons name="person-circle-outline" size={32} color={AppColors.primary} />
        </TouchableOpacity>
      </View>

      {!hasProfile && (
        <TouchableOpacity style={styles.setupPrompt} onPress={() => router.push('/(tabs)/setup')}>
          <Ionicons name="information-circle-outline" size={18} color={AppColors.primary} />
          <Text style={styles.setupPromptText}>
            Set up your profile so the chat can personalise your guidance →
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.chatBtn}
        onPress={() => router.push('/(tabs)/chat')}
        activeOpacity={0.85}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
        <Text style={styles.chatBtnText}>Start a Health Chat</Text>
      </TouchableOpacity>

      {medications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Medications</Text>
          {medications.slice(0, 3).map(med => (
            <View key={med.id} style={styles.medRow}>
              <Ionicons name="medical-outline" size={16} color={AppColors.primary} />
              <View style={styles.medInfo}>
                <Text style={styles.medName}>{med.name}</Text>
                {(med.dose || med.frequency) ? (
                  <Text style={styles.medDetail}>
                    {[med.dose, med.frequency].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
          {medications.length > 3 && (
            <TouchableOpacity onPress={() => router.push('/(tabs)/medications')}>
              <Text style={styles.seeAll}>See all {medications.length} medications →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Chats</Text>
        {recentConvs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubble-outline" size={28} color={AppColors.textMuted} />
            <Text style={styles.emptyText}>No chats yet. Start one above.</Text>
          </View>
        ) : (
          recentConvs.map(c => (
            <TouchableOpacity
              key={c.id}
              style={styles.convCard}
              onPress={() => router.push('/(tabs)/history')}
            >
              <View
                style={[
                  styles.outcomeDot,
                  { backgroundColor: OUTCOME_COLORS[c.safetyOutcome] ?? AppColors.textMuted },
                ]}
              />
              <View style={styles.convInfo}>
                <Text style={styles.convTitle} numberOfLines={1}>{c.title}</Text>
                <Text style={styles.convMeta}>
                  {new Date(c.updatedAt).toLocaleDateString()} · {c.messages.length} messages
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={AppColors.textMuted} />
            </TouchableOpacity>
          ))
        )}
        {recentConvs.length > 0 && (
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
            <Text style={styles.seeAll}>View all conversations →</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
          {[
            { label: 'Medications', icon: 'medical-outline', route: '/(tabs)/medications' },
            { label: 'Find Doctors', icon: 'people-outline', route: '/(tabs)/doctors' },
            { label: 'Profile', icon: 'person-outline', route: '/(tabs)/setup' },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.quickCard}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons name={item.icon as any} size={22} color={AppColors.primary} />
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.emergencyCard}>
        <Ionicons name="alert-circle-outline" size={20} color={AppColors.emergency} />
        <View style={styles.emergencyInfo}>
          <Text style={styles.emergencyTitle}>In an emergency?</Text>
          <Text style={styles.emergencyBody}>Call 911 or your local emergency number immediately.</Text>
        </View>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => Linking.openURL('tel:911')}
        >
          <Text style={styles.callBtnText}>Call 911</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimer}>
        MyNurse is for health education and tracking only — not a substitute for professional medical care.
      </Text>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  greeting: { fontSize: FontSize.xl, fontWeight: '700', color: AppColors.text },
  tagline: { fontSize: FontSize.sm, color: AppColors.textSecondary, marginTop: 2 },
  setupPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppColors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  setupPromptText: { flex: 1, fontSize: FontSize.sm, color: AppColors.primary, fontWeight: '500' },
  chatBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  chatBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '600' },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: AppColors.text, marginBottom: Spacing.sm },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: AppColors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  medInfo: { flex: 1 },
  medName: { fontSize: FontSize.sm, fontWeight: '600', color: AppColors.text },
  medDetail: { fontSize: FontSize.xs, color: AppColors.textSecondary },
  seeAll: { fontSize: FontSize.sm, color: AppColors.primary, marginTop: Spacing.sm, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.sm, color: AppColors.textMuted },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: AppColors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  outcomeDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  convInfo: { flex: 1 },
  convTitle: { fontSize: FontSize.sm, fontWeight: '600', color: AppColors.text },
  convMeta: { fontSize: FontSize.xs, color: AppColors.textSecondary, marginTop: 2 },
  quickGrid: { flexDirection: 'row', gap: Spacing.sm },
  quickCard: {
    flex: 1,
    backgroundColor: AppColors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  quickLabel: { fontSize: FontSize.xs, color: AppColors.text, fontWeight: '500', textAlign: 'center' },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: AppColors.emergencyLight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AppColors.emergencyBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  emergencyInfo: { flex: 1 },
  emergencyTitle: { fontSize: FontSize.sm, fontWeight: '700', color: AppColors.emergency },
  emergencyBody: { fontSize: FontSize.xs, color: AppColors.emergency, marginTop: 2 },
  callBtn: {
    backgroundColor: AppColors.emergency,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  disclaimer: { fontSize: FontSize.xs, color: AppColors.textMuted, textAlign: 'center', lineHeight: 18 },
});
