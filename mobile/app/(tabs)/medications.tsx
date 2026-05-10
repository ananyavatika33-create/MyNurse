import { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getMedications, saveMedication, deleteMedication } from '@/lib/storage';
import { Medication } from '@/lib/types';
import { AppColors, Spacing, Radius, FontSize } from '@/constants/theme';

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const EMPTY_MED: Omit<Medication, 'id' | 'createdAt'> = {
  name: '',
  dose: '',
  frequency: '',
  notes: '',
  active: true,
};

export default function MedicationsScreen() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [form, setForm] = useState(EMPTY_MED);

  useFocusEffect(
    useCallback(() => {
      getMedications().then(setMedications);
    }, [])
  );

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_MED);
    setModalVisible(true);
  }

  function openEdit(med: Medication) {
    setEditing(med);
    setForm({ name: med.name, dose: med.dose, frequency: med.frequency, notes: med.notes, active: med.active });
    setModalVisible(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Please enter the medication name.');
      return;
    }
    const med: Medication = {
      id: editing?.id ?? uuid(),
      createdAt: editing?.createdAt ?? new Date().toISOString(),
      ...form,
      name: form.name.trim(),
    };
    await saveMedication(med);
    const updated = await getMedications();
    setMedications(updated);
    setModalVisible(false);
  }

  async function handleDelete(id: string) {
    Alert.alert('Remove Medication', 'Are you sure you want to remove this medication?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteMedication(id);
          setMedications(m => m.filter(x => x.id !== id));
        },
      },
    ]);
  }

  async function toggleActive(med: Medication) {
    const updated = { ...med, active: !med.active };
    await saveMedication(updated);
    setMedications(m => m.map(x => (x.id === med.id ? updated : x)));
  }

  const active = medications.filter(m => m.active);
  const inactive = medications.filter(m => !m.active);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AppColors.background }} edges={['top']}>
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Medications</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          Track your medications here to personalise your symptom guidance. MyNurse never recommends changing or stopping medications.
        </Text>

        {medications.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="medical-outline" size={40} color={AppColors.textMuted} />
            <Text style={styles.emptyText}>No medications yet.</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
              <Text style={styles.emptyAddBtnText}>Add your first medication</Text>
            </TouchableOpacity>
          </View>
        )}

        {active.length > 0 && (
          <>
            <Text style={styles.groupLabel}>Active</Text>
            {active.map(med => (
              <MedCard
                key={med.id}
                med={med}
                onEdit={() => openEdit(med)}
                onDelete={() => handleDelete(med.id)}
                onToggle={() => toggleActive(med)}
              />
            ))}
          </>
        )}

        {inactive.length > 0 && (
          <>
            <Text style={styles.groupLabel}>Inactive</Text>
            {inactive.map(med => (
              <MedCard
                key={med.id}
                med={med}
                onEdit={() => openEdit(med)}
                onDelete={() => handleDelete(med.id)}
                onToggle={() => toggleActive(med)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Medication' : 'Add Medication'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={AppColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Medication Name <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Metformin, Lisinopril"
              placeholderTextColor={AppColors.textMuted}
              value={form.name}
              onChangeText={v => setForm(f => ({ ...f, name: v }))}
            />

            <Text style={styles.label}>Dose</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500mg, 10mg"
              placeholderTextColor={AppColors.textMuted}
              value={form.dose}
              onChangeText={v => setForm(f => ({ ...f, dose: v }))}
            />

            <Text style={styles.label}>Frequency</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. twice daily, morning"
              placeholderTextColor={AppColors.textMuted}
              value={form.frequency}
              onChangeText={v => setForm(f => ({ ...f, frequency: v }))}
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. take with food, prescribed for diabetes"
              placeholderTextColor={AppColors.textMuted}
              value={form.notes}
              onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              multiline
              numberOfLines={3}
            />

            <View style={styles.switchRow}>
              <Text style={styles.label}>Currently Active</Text>
              <Switch
                value={form.active}
                onValueChange={v => setForm(f => ({ ...f, active: v }))}
                trackColor={{ true: AppColors.primary }}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Medication</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
    </SafeAreaView>
  );
}

function MedCard({
  med,
  onEdit,
  onDelete,
  onToggle,
}: {
  med: Medication;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <View style={[cardStyles.card, !med.active && cardStyles.inactive]}>
      <View style={cardStyles.top}>
        <View style={cardStyles.left}>
          <Text style={cardStyles.name}>{med.name}</Text>
          {(med.dose || med.frequency) ? (
            <Text style={cardStyles.detail}>
              {[med.dose, med.frequency].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          {med.notes ? <Text style={cardStyles.notes}>{med.notes}</Text> : null}
        </View>
        <View style={cardStyles.actions}>
          <TouchableOpacity onPress={onEdit} style={cardStyles.actionBtn}>
            <Ionicons name="create-outline" size={18} color={AppColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={cardStyles.actionBtn}>
            <Ionicons name="trash-outline" size={18} color={AppColors.emergency} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={cardStyles.bottom}>
        <Text style={cardStyles.activeLabel}>{med.active ? 'Active' : 'Inactive'}</Text>
        <Switch
          value={med.active}
          onValueChange={onToggle}
          trackColor={{ true: AppColors.primary }}
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: AppColors.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppColors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: FontSize.sm },
  disclaimer: { fontSize: FontSize.xs, color: AppColors.textSecondary, marginBottom: Spacing.md, lineHeight: 18 },
  groupLabel: { fontSize: FontSize.sm, fontWeight: '600', color: AppColors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  empty: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.md, color: AppColors.textMuted },
  emptyAddBtn: { marginTop: Spacing.sm },
  emptyAddBtnText: { color: AppColors.primary, fontWeight: '500', fontSize: FontSize.sm },
  modal: { flex: 1, backgroundColor: AppColors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '700', color: AppColors.text },
  modalContent: { padding: Spacing.md, paddingBottom: Spacing.xl },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: AppColors.text, marginBottom: 6, marginTop: Spacing.sm },
  required: { color: AppColors.emergency },
  input: {
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: AppColors.text,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  saveBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: FontSize.md },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  inactive: { opacity: 0.55 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  left: { flex: 1 },
  name: { fontSize: FontSize.md, fontWeight: '600', color: AppColors.text },
  detail: { fontSize: FontSize.sm, color: AppColors.textSecondary, marginTop: 2 },
  notes: { fontSize: FontSize.xs, color: AppColors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 4 },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
    paddingTop: Spacing.sm,
  },
  activeLabel: { fontSize: FontSize.xs, color: AppColors.textSecondary },
});
