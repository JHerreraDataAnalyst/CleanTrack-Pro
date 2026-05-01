import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Calendar, Agenda, CalendarList } from 'react-native-calendars';
import { useCalendar } from '../../hooks/useCalendar';
import { CALENDAR_THEME } from '../../constants/calendarTheme';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function CalendarScreen() {
  const {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    isLoading,
    markedDates,
    agendaItems,
    userRole,
  } = useCalendar();

  const queryClient = useQueryClient();
  const router = useRouter();

  const handleAddAssignment = () => {
    // Ejemplo: router.push('/admin/assign-task');
    // Para invalidar el caché después de asignar una tarea exitosamente:
    // queryClient.invalidateQueries({ queryKey: ['calendarAssignments'] });
    console.log('Navegando a crear asignación...');
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Segmented Control */}
      <View className="flex-row p-4 border-b border-gray-100 bg-white">
        <View className="flex-row flex-1 bg-gray-100 rounded-xl p-1">
          {(['day', 'week', 'month'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setViewMode(mode)}
              className={`flex-1 py-2 items-center rounded-lg ${
                viewMode === mode ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text
                className={`font-bold capitalize ${
                  viewMode === mode ? 'text-brand-primary' : 'text-gray-500'
                }`}
              >
                {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>



      {/* Calendar Views */}
      <View className="flex-1">
        {viewMode === 'month' && (
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            theme={CALENDAR_THEME}
            enableSwipeMonths={true}
            markingType={'custom'}
          />
        )}

        {viewMode === 'week' && (
          <CalendarList
            horizontal={true}
            pagingEnabled={true}
            calendarWidth={375} // Podría ser dinámico pero 375 es estándar
            markedDates={markedDates}
            theme={CALENDAR_THEME}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setViewMode('day');
            }}
          />
        )}

        {viewMode === 'day' && (
          <Agenda
            items={agendaItems}
            selected={selectedDate}
            renderItem={(item: any) => (
              <View className="bg-white p-4 mr-4 mt-4 rounded-xl shadow-sm border border-gray-100">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-brand-primary font-bold text-lg">
                    {item.address.street}
                  </Text>
                  <View className="bg-green-100 px-2 py-1 rounded-md">
                    <Text className="text-green-700 font-bold text-xs">
                      {item.totalHours}h
                    </Text>
                  </View>
                </View>
                <Text className="text-gray-600 mb-4">
                  {item.address.city} • {item.worker.name}
                </Text>
                <TouchableOpacity className="bg-brand-primary py-2 rounded-lg items-center">
                  <Text className="text-white font-bold">Registrar trabajo</Text>
                </TouchableOpacity>
              </View>
            )}
            renderEmptyDate={() => (
              <View className="flex-1 justify-center items-center p-10 opacity-40">
                <IconSymbol name="calendar.badge.exclamationmark" size={48} color="#9CA3AF" />
                <Text className="text-gray-500 mt-2 font-medium">Sin tareas para este día</Text>
              </View>
            )}
            theme={CALENDAR_THEME}
            rowHasChanged={(r1: any, r2: any) => r1.id !== r2.id}
          />
        )}
      </View>

      {/* FAB for Admins */}
      {userRole === 'ADMIN' && (
        <TouchableOpacity 
          className="absolute bottom-6 right-6 w-14 h-14 bg-brand-primary rounded-full items-center justify-center shadow-lg shadow-black/30"
          activeOpacity={0.8}
          onPress={handleAddAssignment}
        >
          <IconSymbol name="plus" size={32} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}
