import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { AppColors, Spacing, Radius, FontSize } from '@/constants/theme';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  address: string;
  phone?: string;
  mapsQuery: string;
}

function buildNearbyQuery(lat: number, lon: number): Doctor[] {
  return [
    {
      id: '1',
      name: 'Search "GP near me"',
      specialty: 'General Practice',
      address: 'Find GPs near your location',
      mapsQuery: `general+practitioner+near+${lat},${lon}`,
    },
    {
      id: '2',
      name: 'Search "Urgent Care near me"',
      specialty: 'Urgent Care',
      address: 'Find urgent care clinics near you',
      mapsQuery: `urgent+care+near+${lat},${lon}`,
    },
    {
      id: '3',
      name: 'Search "Emergency Room near me"',
      specialty: 'Emergency',
      address: 'Find emergency rooms near you',
      mapsQuery: `emergency+room+near+${lat},${lon}`,
    },
    {
      id: '4',
      name: 'Search "Pharmacy near me"',
      specialty: 'Pharmacy',
      address: 'Find pharmacies near your location',
      mapsQuery: `pharmacy+near+${lat},${lon}`,
    },
    {
      id: '5',
      name: 'Search "Telehealth services"',
      specialty: 'Telehealth',
      address: 'Virtual consultations available online',
      mapsQuery: `telehealth+doctor+online`,
    },
  ];
}

const SPECIALTY_ICONS: Record<string, string> = {
  'General Practice': 'person-outline',
  'Urgent Care': 'medkit-outline',
  Emergency: 'alert-circle-outline',
  Pharmacy: 'storefront-outline',
  Telehealth: 'videocam-outline',
};

function openMaps(query: string) {
  const url =
    Platform.OS === 'ios'
      ? `maps://?q=${query}`
      : `https://maps.google.com/?q=${query}`;
  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  });
}

export default function DoctorsScreen() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  async function requestLocation() {
    setStatus('loading');
    const { status: perm } = await Location.requestForegroundPermissionsAsync();
    if (perm !== 'granted') {
      setStatus('denied');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const lat = loc.coords.latitude;
    const lon = loc.coords.longitude;
    setCoords({ lat, lon });
    setDoctors(buildNearbyQuery(lat, lon));
    setStatus('granted');
  }

  function callEmergency() {
    Linking.openURL('tel:911');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Find Medical Help</Text>
      <Text style={styles.subtitle}>
        Use your location to find GPs, urgent care, pharmacies, and emergency services near you.
      </Text>

      <View style={styles.emergencyBanner}>
        <Ionicons name="alert-circle" size={22} color={AppColors.emergency} />
        <View style={styles.emergencyText}>
          <Text style={styles.emergencyTitle}>In an emergency?</Text>
          <Text style={styles.emergencyBody}>Call 911 or your local emergency number immediately.</Text>
        </View>
        <TouchableOpacity style={styles.callBtn} onPress={callEmergency}>
          <Ionicons name="call" size={16} color="#fff" />
          <Text style={styles.callBtnText}>Call 911</Text>
        </TouchableOpacity>
      </View>

      {status === 'idle' && (
        <View style={styles.permissionBox}>
          <Ionicons name="location-outline" size={40} color={AppColors.primary} />
          <Text style={styles.permissionTitle}>Find doctors near you</Text>
          <Text style={styles.permissionBody}>
            Allow location access to search for GPs, urgent care, and pharmacies nearby.
          </Text>
          <TouchableOpacity style={styles.locationBtn} onPress={requestLocation}>
            <Ionicons name="location" size={18} color="#fff" />
            <Text style={styles.locationBtnText}>Use My Location</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator color={AppColors.primary} size="large" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      )}

      {status === 'denied' && (
        <View style={styles.permissionBox}>
          <Ionicons name="location-outline" size={40} color={AppColors.warning} />
          <Text style={styles.permissionTitle}>Location access denied</Text>
          <Text style={styles.permissionBody}>
            Enable location in your device settings to find nearby doctors.
          </Text>
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.locationBtnText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {status === 'granted' && coords && (
        <>
          <View style={styles.coordsBadge}>
            <Ionicons name="location" size={14} color={AppColors.success} />
            <Text style={styles.coordsText}>Location found — tap a card to open Maps</Text>
          </View>

          {doctors.map(doc => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docCard}
              onPress={() => openMaps(doc.mapsQuery)}
              activeOpacity={0.8}
            >
              <View style={styles.docIcon}>
                <Ionicons
                  name={(SPECIALTY_ICONS[doc.specialty] ?? 'person-outline') as any}
                  size={22}
                  color={AppColors.primary}
                />
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docName}>{doc.name}</Text>
                <Text style={styles.docSpecialty}>{doc.specialty}</Text>
                <Text style={styles.docAddress}>{doc.address}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={AppColors.textMuted} />
            </TouchableOpacity>
          ))}
        </>
      )}

      <View style={styles.telehealthSection}>
        <Text style={styles.sectionTitle}>Telehealth Options</Text>
        {[
          { name: 'Teladoc', url: 'https://www.teladoc.com', desc: 'Video and phone consultations' },
          { name: 'MDLive', url: 'https://www.mdlive.com', desc: 'On-demand doctors 24/7' },
          { name: 'Amazon Clinic', url: 'https://clinic.amazon.com', desc: 'Care for common conditions' },
        ].map(t => (
          <TouchableOpacity
            key={t.name}
            style={styles.telehealthCard}
            onPress={() => Linking.openURL(t.url)}
          >
            <Ionicons name="videocam-outline" size={20} color={AppColors.primary} />
            <View style={styles.telehealthInfo}>
              <Text style={styles.telehealthName}>{t.name}</Text>
              <Text style={styles.telehealthDesc}>{t.desc}</Text>
            </View>
            <Ionicons name="open-outline" size={16} color={AppColors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  title: { fontSize: FontSize.xl, fontWeight: '700', color: AppColors.text, marginBottom: 4 },
  subtitle: { fontSize: FontSize.sm, color: AppColors.textSecondary, marginBottom: Spacing.md, lineHeight: 20 },
  emergencyBanner: {
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
  emergencyText: { flex: 1 },
  emergencyTitle: { fontSize: FontSize.sm, fontWeight: '700', color: AppColors.emergency },
  emergencyBody: { fontSize: FontSize.xs, color: AppColors.emergency, marginTop: 2 },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AppColors.emergency,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  callBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  permissionBox: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  permissionTitle: { fontSize: FontSize.lg, fontWeight: '600', color: AppColors.text },
  permissionBody: { fontSize: FontSize.sm, color: AppColors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: Spacing.lg },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: AppColors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  locationBtnText: { color: '#fff', fontWeight: '600', fontSize: FontSize.md },
  center: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  loadingText: { fontSize: FontSize.sm, color: AppColors.textSecondary },
  coordsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.md,
  },
  coordsText: { fontSize: FontSize.xs, color: AppColors.success },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: AppColors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: AppColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: { flex: 1 },
  docName: { fontSize: FontSize.sm, fontWeight: '600', color: AppColors.text },
  docSpecialty: { fontSize: FontSize.xs, color: AppColors.primary, marginTop: 2 },
  docAddress: { fontSize: FontSize.xs, color: AppColors.textSecondary, marginTop: 2 },
  telehealthSection: { marginTop: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: AppColors.text, marginBottom: Spacing.sm },
  telehealthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: AppColors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  telehealthInfo: { flex: 1 },
  telehealthName: { fontSize: FontSize.sm, fontWeight: '600', color: AppColors.text },
  telehealthDesc: { fontSize: FontSize.xs, color: AppColors.textSecondary, marginTop: 2 },
});
