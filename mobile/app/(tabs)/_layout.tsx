import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
  const { user, isLoading } = useAuth();
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
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F3F4F6',
          elevation: 10,
          shadowOpacity: 0.1,
          shadowRadius: 10,
        }
      }}>

      {user?.role === 'TRABAJADOR' && (
        <Tabs.Screen
          name="worker"
          options={{
            title: 'Asignaciones',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet.clipboard" color={color} />,
          }}
        />
      )}

      {user?.role === 'ADMIN' && (
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
          }}
        />
      )}
    </Tabs>
  );
}