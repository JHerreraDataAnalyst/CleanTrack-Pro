import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Calendar, Agenda, CalendarList } from 'react-native-calendars';
import { useCalendar, CalendarAssignment } from '../../hooks/useCalendar';
import { CALENDAR_THEME } from '../../constants/calendarTheme';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { isBefore, startOfDay, parseISO } from 'date-fns';
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

  // Estado para el modal de detalle
  const [selectedAssignment, setSelectedAssignment] = useState<CalendarAssignment | null>(null);

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
                <TouchableOpacity 
                  className="bg-brand-primary py-2 rounded-lg items-center"
                  onPress={() => setSelectedAssignment(item)}
                >
                  <Text className="text-white font-bold">Ver Detalles</Text>
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
      {/* Modal de Detalle de Asignación */}
      <Modal
        visible={!!selectedAssignment}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedAssignment(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 min-h-[50%] shadow-xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-800">Detalles del Servicio</Text>
              <TouchableOpacity onPress={() => setSelectedAssignment(null)} className="p-2 bg-gray-100 rounded-full">
                <IconSymbol name="xmark" size={20} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {selectedAssignment && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Dirección */}
                <View className="mb-6">
                  <Text className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Dirección</Text>
                  <Text className="text-lg text-gray-800 font-medium">{selectedAssignment.address.street}</Text>
                  <Text className="text-base text-gray-600">{selectedAssignment.address.city}</Text>
                </View>

                {/* Notas / Instrucciones */}
                <View className="mb-6">
                  <Text className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Notas del Servicio</Text>
                  <View className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <Text className="text-blue-800 text-base">
                      {selectedAssignment.address.instructions || "No hay notas adicionales para este servicio."}
                    </Text>
                  </View>
                </View>

                {/* Horario Registrado */}
                <View className="mb-6">
                  <Text className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Horario Registrado</Text>
                  <View className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    {selectedAssignment.workRecords && selectedAssignment.workRecords.length > 0 ? (
                      selectedAssignment.workRecords.map((record, index) => (
                        <View key={record.id} className={`flex-row justify-between items-center ${index > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}`}>
                          <Text className="text-gray-700 font-medium">Habitación/Área</Text>
                          <Text className="text-brand-primary font-bold">{record.hours} horas</Text>
                        </View>
                      ))
                    ) : (
                      <Text className="text-gray-500 italic">No hay horas registradas aún.</Text>
                    )}
                    <View className="mt-3 pt-3 border-t border-gray-300 flex-row justify-between items-center">
                      <Text className="font-bold text-gray-800">Total</Text>
                      <Text className="font-bold text-brand-primary text-lg">{selectedAssignment.totalHours} horas</Text>
                    </View>
                  </View>
                </View>

                {/* Acciones */}
                <View className="mt-4 mb-8">
                  {userRole === 'ADMIN' ? (
                    <TouchableOpacity 
                      className="bg-brand-primary py-4 rounded-xl items-center shadow-sm"
                      onPress={() => {
                        console.log('Navegando a editar horas de la asignación:', selectedAssignment.id);
                        // router.push(`/admin/edit-assignment/${selectedAssignment.id}`);
                        setSelectedAssignment(null);
                      }}
                    >
                      <Text className="text-white font-bold text-lg">Editar Asignación</Text>
                    </TouchableOpacity>
                  ) : (
                    <View>
                      {isBefore(parseISO(selectedAssignment.date), startOfDay(new Date())) ? (
                        <View className="bg-gray-100 py-4 rounded-xl items-center border border-gray-200">
                          <Text className="text-gray-500 font-bold text-lg">Servicio Pasado (Solo Lectura)</Text>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          className="bg-brand-primary py-4 rounded-xl items-center shadow-sm"
                          onPress={() => {
                            console.log('Navegando a registrar trabajo:', selectedAssignment.id);
                            // router.push(`/worker/log-hours/${selectedAssignment.id}`);
                            setSelectedAssignment(null);
                          }}
                        >
                          <Text className="text-white font-bold text-lg">Registrar Trabajo</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
