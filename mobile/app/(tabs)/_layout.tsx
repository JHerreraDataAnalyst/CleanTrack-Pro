import { Tabs, Redirect } from 'expo-router';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-brand-light">
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  // Redirigir al login si no hay usuario autenticado
  if (!user) {
    return <Redirect href="/" />;
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
      
      {/* Pestaña del Trabajador: Solo visible para trabajadores */}
      <Tabs.Screen
        name="worker"
        options={{
          title: 'Asignaciones',
          href: user.role === 'TRABAJADOR' ? '/worker' : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet.clipboard" color={color} />,
        }}
      />

      {/* Pestaña del Administrador: Solo visible para admins */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Dashboard',
          href: user.role === 'ADMIN' ? '/admin' : null,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
