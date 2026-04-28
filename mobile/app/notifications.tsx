import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  const API_URL = 'http://192.168.1.137:3000/api/notifications';

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}?userId=${user.id}`);
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return; // Already read
    
    // Optimistic UI update
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );

    try {
      await fetch(`${API_URL}/${id}/read`, {
        method: 'PATCH',
      });
    } catch (error) {
      console.error('Error marking as read:', error);
      // Revert if failed
      fetchNotifications();
    }
  };

  return (
    <View className="flex-1 bg-brand-light">
      <View className="bg-white px-4 pt-12 pb-4 flex-row items-center border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-brand-dark ml-2">Notificaciones</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {loading ? (
          <ActivityIndicator size="large" color="#0066FF" style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View className="items-center justify-center p-10 mt-10">
            <IconSymbol name="bell.fill" size={48} color="#D1D5DB" />
            <Text className="text-gray-500 text-center mt-4">No tienes notificaciones por ahora.</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity 
              key={notification.id} 
              className={`rounded-2xl p-4 mb-3 shadow-sm border ${notification.isRead ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-200'}`}
              onPress={() => markAsRead(notification.id, notification.isRead)}
              activeOpacity={0.7}
            >
              <View className="flex-row justify-between items-start mb-1">
                <Text className={`text-lg font-bold ${notification.isRead ? 'text-brand-dark' : 'text-brand-primary'}`}>
                  {notification.title}
                </Text>
                {!notification.isRead && (
                  <View className="w-2.5 h-2.5 bg-brand-primary rounded-full mt-2" />
                )}
              </View>
              <Text className={`${notification.isRead ? 'text-gray-500' : 'text-gray-800'}`}>
                {notification.message}
              </Text>
              <Text className="text-xs text-gray-400 mt-2">
                {new Date(notification.createdAt).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
