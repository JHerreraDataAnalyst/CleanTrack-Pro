import { Tabs, useRouter, useSegments, Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '../../context/AuthContext';

function NotificationBell({ userId }: { userId: string }) {
  const [hasUnread, setHasUnread] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const res = await fetch(`http://192.168.1.137:3000/api/notifications?userId=${userId}`);
        const data = await res.json();
        if (data && data.some((n: any) => !n.isRead)) {
          setHasUnread(true);
        } else {
          setHasUnread(false);
        }
      } catch (e) {
        // Silently fail for polling
      }
    };
    
    checkNotifications();
    const interval = setInterval(checkNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [userId]);

  return (
    <Link href="/notifications" asChild>
      <TouchableOpacity className="mr-4 relative p-2">
        <IconSymbol name="bell.fill" size={24} color="#1F2937" />
        {hasUnread && (
          <View className="absolute top-1 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
        )}
      </TouchableOpacity>
    </Link>
  );
}

function HeaderRightControls({ userId, logout }: { userId: string, logout: () => void }) {
  const router = useRouter();
  
  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <View className="flex-row items-center mr-2">
      <NotificationBell userId={userId} />
      <TouchableOpacity onPress={handleLogout} className="p-2 ml-1">
        <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Redirect to login if not authenticated
        router.replace('/');
      }
    }
  }, [isLoading, user, router]);

  // Don't render tabs while checking auth or if no user
  if (isLoading || !user) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-light">
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0066FF',
        headerShown: true,
        headerRight: () => <HeaderRightControls userId={user.id} logout={logout} />,
        headerTitle: 'CleanTrack Pro',
        headerTitleStyle: { fontWeight: 'bold', color: '#1F2937' },
        headerStyle: { backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3F4F6',
          elevation: 10,
          shadowOpacity: 0.1,
          shadowRadius: 10,
        }
      }}>

      <Tabs.Screen
        name="worker"
        options={{
          title: 'Asignaciones',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet.clipboard" color={color} />,
          href: user.role === 'TRABAJADOR' ? '/(tabs)/worker' : null,
        }}
      />

      <Tabs.Screen
        name="sites"
        options={{
          title: 'Sedes',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="building.2.fill" color={color} />,
          href: user.role === 'TRABAJADOR' ? '/(tabs)/sites' : null,
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
          href: user.role === 'ADMIN' ? '/(tabs)/admin' : null,
        }}
      />
    </Tabs>
  );
}