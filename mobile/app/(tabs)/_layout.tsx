import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AppColors.primary,
        tabBarInactiveTintColor: AppColors.textMuted,
        tabBarStyle: { borderTopColor: AppColors.border },
        headerStyle: { backgroundColor: AppColors.surface },
        headerTintColor: AppColors.text,
        headerShadowVisible: false,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <TabIcon name="chatbubble-ellipses" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <TabIcon name="time" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: 'Medications',
          tabBarIcon: ({ color, size }) => <TabIcon name="medical" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="setup"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <TabIcon name="person-circle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen name="doctors" options={{ href: null }} />
      <Tabs.Screen name="checkin" options={{ href: null }} />
    </Tabs>
  );
}
