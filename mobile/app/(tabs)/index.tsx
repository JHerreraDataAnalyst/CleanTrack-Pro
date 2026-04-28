import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';

export default function DailyAssignmentsScreen() {
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [hours, setHours] = useState('');

  // Mock data para las asignaciones del día
  const assignments = [
    { id: '1', address: '123 Main St, Springfield', room: 'Cocina', date: '2026-04-28' },
    { id: '2', address: '456 Elm St, Springfield', room: 'Baño Principal', date: '2026-04-28' },
  ];

  const handleConfirm = (id: string) => {
    if (!hours) {
      Alert.alert('Error', 'Por favor ingresa las horas trabajadas');
      return;
    }
    // Aquí iría el llamado a la API PATCH /api/work-records/:id/verify
    Alert.alert('Éxito', 'Horas verificadas y guardadas correctamente', [
      { text: 'OK', onPress: () => {
        setSelectedAssignment(null);
        setHours('');
      }}
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-brand-light p-4">
      <Text className="text-2xl font-bold text-brand-dark mb-6 mt-4">
        Asignaciones de Hoy
      </Text>

      {assignments.map((task) => (
        <View key={task.id} className="bg-brand-white rounded-xl p-5 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-start mb-2">
            <View>
              <Text className="text-lg font-semibold text-brand-dark">{task.address}</Text>
              <Text className="text-brand-primary font-medium mt-1">Habitación: {task.room}</Text>
            </View>
          </View>

          {selectedAssignment === task.id ? (
            <View className="mt-4 pt-4 border-t border-gray-100">
              <Text className="text-gray-600 mb-2 font-medium">Horas Trabajadas:</Text>
              <TextInput
                className="bg-brand-light border border-gray-200 rounded-lg p-3 text-brand-dark mb-4"
                keyboardType="numeric"
                placeholder="Ej. 2.5"
                value={hours}
                onChangeText={setHours}
              />
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  className="flex-1 bg-gray-200 p-3 rounded-lg items-center"
                  onPress={() => setSelectedAssignment(null)}
                >
                  <Text className="text-gray-700 font-semibold">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className="flex-1 bg-brand-success p-3 rounded-lg items-center shadow-sm"
                  onPress={() => handleConfirm(task.id)}
                >
                  <Text className="text-white font-bold text-base">Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              className="mt-4 bg-brand-primary p-3 rounded-lg items-center shadow-sm"
              onPress={() => {
                setSelectedAssignment(task.id);
                setHours('');
              }}
            >
              <Text className="text-white font-bold text-base">Registrar Horas</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
