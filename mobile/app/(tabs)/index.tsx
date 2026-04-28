import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';

export default function DailyAssignmentsScreen() {
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [hours, setHours] = useState('');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Usar la IP local obtenida para comunicarse con el backend en la misma red Wi-Fi
  const API_URL = 'http://192.168.1.137:3000/api/work-records';

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const response = await fetch(API_URL);
        const data = await response.json();
        setAssignments(data);
      } catch (error) {
        console.error('Error fetching assignments:', error);
        Alert.alert('Error', 'No se pudieron cargar las asignaciones');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  const handleConfirm = async (id: string) => {
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

      {loading ? (
        <ActivityIndicator size="large" color="#0066FF" className="mt-10" />
      ) : assignments.length === 0 ? (
        <Text className="text-center text-gray-500 mt-10">No hay asignaciones para mostrar.</Text>
      ) : (
        assignments.map((task) => (
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
        ))
      )}
    </ScrollView>
  );
}
