import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getProfile, saveProfile } from '@/lib/storage';
import { UserProfile } from '@/lib/types';
import { AppColors, Spacing, Radius, FontSize } from '@/constants/theme';

const SEX_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const DIET_OPTIONS = [
  'No preference',
  'Omnivore',
  'Vegetarian',
  'Vegan',
  'Pescatarian',
  'Halal',
  'Kosher',
  'Gluten-free',
  'Dairy-free',
];
const WEIGHT_UNITS = ['kg', 'lbs'] as const;

const DEFAULT_PROFILE: UserProfile = {
  firstName: '',
  age: '',
  weight: '',
  weightUnit: 'lbs',
  sex: '',
  diet: 'No preference',
  conditions: '',
  medications: '',
  allergies: '',
};

export default function SetupScreen() {
  const [form, setForm] = useState<UserProfile>(DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getProfile().then(p => { if (p) setForm(p); });
    }, [])
  );

  function set<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    await saveProfile(form);
    setSaved(true);
    Alert.alert('Saved', 'Your profile has been saved. The chat will use this info to personalise guidance.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.background }} edges={['top']}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Your Profile</Text>
      <Text style={styles.subtitle}>
        This information is stored only on your device and used to personalise health guidance in the chat.
      </Text>

      <Section title="Personal">
        <Field label="First Name">
          <TextInput
            style={styles.input}
            placeholder="e.g. Sarah"
            placeholderTextColor={AppColors.textMuted}
            value={form.firstName}
            onChangeText={v => set('firstName', v)}
          />
        </Field>

        <Field label="Age">
          <TextInput
            style={styles.input}
            placeholder="e.g. 32"
            placeholderTextColor={AppColors.textMuted}
            value={form.age}
            onChangeText={v => set('age', v)}
            keyboardType="numeric"
          />
        </Field>

        <Field label="Biological Sex">
          <View style={styles.optionRow}>
            {SEX_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionBtn, form.sex === opt && styles.optionBtnActive]}
                onPress={() => set('sex', opt)}
              >
                <Text style={[styles.optionBtnText, form.sex === opt && styles.optionBtnTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Weight">
          <View style={styles.weightRow}>
            <TextInput
              style={[styles.input, styles.weightInput]}
              placeholder="e.g. 140"
              placeholderTextColor={AppColors.textMuted}
              value={form.weight}
              onChangeText={v => set('weight', v)}
              keyboardType="numeric"
            />
            {WEIGHT_UNITS.map(u => (
              <TouchableOpacity
                key={u}
                style={[styles.unitBtn, form.weightUnit === u && styles.unitBtnActive]}
                onPress={() => set('weightUnit', u)}
              >
                <Text style={[styles.unitBtnText, form.weightUnit === u && styles.unitBtnTextActive]}>
                  {u}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="Diet">
          <View style={styles.optionRow}>
            {DIET_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionBtn, form.diet === opt && styles.optionBtnActive]}
                onPress={() => set('diet', opt)}
              >
                <Text style={[styles.optionBtnText, form.diet === opt && styles.optionBtnTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>
      </Section>

      <Section title="Health Information">
        <Text style={styles.sectionHint}>
          This helps the chat give more personalised guidance and flag potential interactions.
        </Text>

        <Field label="Known Medical Conditions">
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. asthma, type 2 diabetes, migraine"
            placeholderTextColor={AppColors.textMuted}
            value={form.conditions}
            onChangeText={v => set('conditions', v)}
            multiline
            numberOfLines={3}
          />
        </Field>

        <Field label="Current Medications">
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Metformin 500mg, Lisinopril 10mg"
            placeholderTextColor={AppColors.textMuted}
            value={form.medications}
            onChangeText={v => set('medications', v)}
            multiline
            numberOfLines={3}
          />
        </Field>

        <Field label="Known Allergies">
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. penicillin, peanuts, sulfa drugs"
            placeholderTextColor={AppColors.textMuted}
            value={form.allergies}
            onChangeText={v => set('allergies', v)}
            multiline
            numberOfLines={2}
          />
        </Field>
      </Section>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Ionicons name={saved ? 'checkmark-circle' : 'save-outline'} size={18} color="#fff" />
        <Text style={styles.saveBtnText}>{saved ? 'Saved!' : 'Save Profile'}</Text>
      </TouchableOpacity>

      <View style={styles.privacyNote}>
        <Ionicons name="lock-closed-outline" size={14} color={AppColors.textSecondary} />
        <Text style={styles.privacyText}>
          Your data stays on your device and is only shared with the MyNurse AI assistant to personalise your health guidance.
        </Text>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      {children}
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
});

const fieldStyles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: AppColors.textSecondary, marginBottom: 6 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: AppColors.text, marginBottom: 4 },
  subtitle: { fontSize: FontSize.sm, color: AppColors.textSecondary, marginBottom: Spacing.lg, lineHeight: 20 },
  sectionHint: { fontSize: FontSize.xs, color: AppColors.textMuted, marginBottom: Spacing.sm, lineHeight: 18 },
  input: {
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: AppColors.text,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  optionBtn: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: AppColors.surface,
  },
  optionBtnActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
  optionBtnText: { fontSize: FontSize.sm, color: AppColors.text },
  optionBtnTextActive: { color: '#fff', fontWeight: '600' },
  weightRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  weightInput: { flex: 1 },
  unitBtn: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: AppColors.surface,
  },
  unitBtnActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
  unitBtnText: { fontSize: FontSize.sm, color: AppColors.text, fontWeight: '500' },
  unitBtnTextActive: { color: '#fff' },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: AppColors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  privacyText: { flex: 1, fontSize: FontSize.xs, color: AppColors.textSecondary, lineHeight: 18 },
  saveBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  saveBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '600' },
  apiKeyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  apiKeyInput: { flex: 1 },
  eyeBtn: { padding: 8 },
  apiKeyActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  clearKeyBtn: {
    width: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AppColors.emergencyBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiKeyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: Spacing.sm,
  },
});
