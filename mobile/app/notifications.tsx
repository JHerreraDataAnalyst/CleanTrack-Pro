import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, isLoading, markAsRead } = useNotifications();

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    // Navegamos al calendario. Como Admin, puede activar su filtro de "Pendientes"
    router.push('/(tabs)/calendar');
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  const renderItem = ({ item }: { item: Notification }) => {
    const dateFormatted = format(parseISO(item.createdAt), "d 'de' MMMM, yyyy - HH:mm", { locale: es });

    return (
      <TouchableOpacity
        className={`p-4 mb-3 mx-4 rounded-2xl border ${
          item.isRead ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-200'
        } shadow-sm`}
        onPress={() => handleNotificationPress(item)}
      >
        <View className="flex-row items-start">
          <View className={`mt-1 mr-3 p-2 rounded-full ${item.isRead ? 'bg-gray-100' : 'bg-red-100'}`}>
            <IconSymbol 
              name="exclamationmark.triangle.fill" 
              size={20} 
              color={item.isRead ? "#9CA3AF" : "#EF4444"} 
            />
          </View>
          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-1">
              <Text className={`font-bold text-lg ${item.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                {item.title}
              </Text>
              {!item.isRead && (
                <View className="bg-brand-primary w-2 h-2 rounded-full" />
              )}
            </View>
            <Text className={`text-base leading-5 ${item.isRead ? 'text-gray-500' : 'text-gray-700'}`}>
              {item.message}
            </Text>
            <Text className="text-xs text-gray-400 mt-3 font-medium">
              {dateFormatted}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="pt-12 pb-4 px-6 bg-white border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-gray-100 rounded-full">
          <IconSymbol name="chevron.left" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-2xl font-bold text-gray-900">Alertas</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        ListEmptyComponent={() => (
          <View className="flex-1 justify-center items-center mt-20">
            <IconSymbol name="bell.slash" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg mt-4 font-medium">No tienes alertas pendientes</Text>
          </View>
        )}
      />
    </View>
  );
}
