import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Calendar, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar.', 'Abr.', 'May.', 'Jun.', 'Jul.', 'Ago.', 'Sep.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

export default function DailyAssignmentsScreen() {
  const [viewMode, setViewMode] = useState<'tareas' | 'acumulado'>('tareas');
  
  // Estado para Tareas
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [hours, setHours] = useState('');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<'hoy' | 'mañana'>('hoy');
  
  // Estado para Acumulado
  const [historyData, setHistoryData] = useState<{ totalHours: number, estimatedPay: number, records: any[] } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const API_URL = 'http://192.168.1.137:3000/api/work-records';

  const fetchAssignments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const targetDate = new Date();
      if (selectedDay === 'mañana') {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      const dateString = targetDate.toISOString().split('T')[0];
      
      const response = await fetch(`${API_URL}?date=${dateString}&workerId=${user.id}`);
      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      Alert.alert('Error', 'No se pudieron cargar las asignaciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/my-history?workerId=${user.id}`);
      const data = await response.json();
      setHistoryData(data);
    } catch (error) {
      console.error('Error fetching history:', error);
      Alert.alert('Error', 'No se pudo cargar el historial');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'tareas') {
      fetchAssignments();
    } else {
      fetchHistory();
    }
  }, [viewMode, selectedDay, user]);

  const handleConfirm = async (id: string) => {
    if (!hours) {
      Alert.alert('Error', 'Por favor ingresa las horas trabajadas');
      return;
    }
    Alert.alert('Éxito', 'Horas verificadas y guardadas correctamente', [
      { text: 'OK', onPress: () => {
        setSelectedAssignment(null);
        setHours('');
      }}
    ]);
  };

  return (
    <View className="flex-1 bg-brand-light">
      {/* Top Toggle */}
      <View className="pt-12 pb-4 px-4 bg-white shadow-sm z-10 border-b border-gray-100">
        <View className="flex-row bg-gray-100 rounded-xl p-1">
          <TouchableOpacity 
            className={`flex-1 py-3 items-center rounded-lg ${viewMode === 'tareas' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setViewMode('tareas')}
          >
            <Text className={`font-bold ${viewMode === 'tareas' ? 'text-brand-primary' : 'text-gray-500'}`}>Tareas de Hoy</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 items-center rounded-lg ${viewMode === 'acumulado' ? 'bg-brand-primary shadow-sm' : ''}`}
            onPress={() => setViewMode('acumulado')}
          >
            <Text className={`font-bold ${viewMode === 'acumulado' ? 'text-white' : 'text-gray-500'}`}>Mi Acumulado</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {viewMode === 'tareas' && (
          <>
            <View className="mb-6">
              {/* Selector de Días interno para las tareas */}
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  className={`px-4 py-2 rounded-full border ${selectedDay === 'hoy' ? 'bg-brand-primary border-brand-primary' : 'bg-white border-gray-200'}`}
                  onPress={() => setSelectedDay('hoy')}
                >
                  <Text className={`font-semibold ${selectedDay === 'hoy' ? 'text-white' : 'text-brand-dark'}`}>Hoy</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  className={`px-4 py-2 rounded-full border ${selectedDay === 'mañana' ? 'bg-brand-primary border-brand-primary' : 'bg-white border-gray-200'}`}
                  onPress={() => setSelectedDay('mañana')}
                >
                  <Text className={`font-semibold ${selectedDay === 'mañana' ? 'text-white' : 'text-brand-dark'}`}>Mañana</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#0066FF" style={{ marginTop: 40 }} />
            ) : assignments.length === 0 ? (
              <Text className="text-center text-gray-500 mt-10">No hay asignaciones para este día.</Text>
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
                  ) : task.isVerified ? (
                    <View className="mt-4 bg-green-50 p-3 rounded-lg border border-green-100 items-center">
                      <Text className="text-green-700 font-bold text-base">✅ Verificado ({task.hours}h)</Text>
                    </View>
                  ) : task.hasRecord ? (
                    <View className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-100 items-center">
                      <Text className="text-yellow-700 font-bold text-base">⏳ Pendiente de confirmación ({task.hours}h)</Text>
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
          </>
        )}

        {viewMode === 'acumulado' && (
          <>
            {loading ? (
              <ActivityIndicator size="large" color="#0066FF" style={{ marginTop: 40 }} />
            ) : historyData ? (
              <>
                <View className="bg-brand-primary rounded-2xl p-6 shadow-lg mb-6">
                  <Text className="text-brand-light font-medium mb-1">Pago Estimado (Mes Actual)</Text>
                  <Text className="text-white text-4xl font-black mb-4">€{historyData.estimatedPay.toFixed(2)}</Text>
                  <View className="flex-row items-center bg-white/20 self-start px-3 py-1.5 rounded-full">
                    <IconSymbol name="clock.fill" size={16} color="white" />
                    <Text className="text-white ml-2 font-semibold">{historyData.totalHours} horas confirmadas</Text>
                  </View>
                </View>

                <Text className="text-xl font-bold text-brand-dark mb-4">Calendario de Trabajo</Text>
                <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
                  <Calendar
                    current={new Date().toISOString().split('T')[0]}
                    markedDates={historyData.records.reduce((acc: any, record: any) => {
                      const dateStr = new Date(record.date).toISOString().split('T')[0];
                      acc[dateStr] = {
                        marked: true,
                        dotColor: record.isVerified ? '#10B981' : '#F59E0B',
                        selected: selectedDate === dateStr,
                        selectedColor: '#0066FF'
                      };
                      return acc;
                    }, {})}
                    onDayPress={(day: any) => setSelectedDate(day.dateString)}
                    theme={{
                      todayTextColor: '#0066FF',
                      arrowColor: '#0066FF',
                      textDayFontWeight: '500',
                      textMonthFontWeight: 'bold',
                      textDayHeaderFontWeight: '600'
                    }}
                  />
                </View>

                {selectedDate && (
                  <View className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-8">
                    <Text className="text-lg font-bold text-brand-dark mb-3">
                      Detalle del {new Date(selectedDate).toLocaleDateString()}
                    </Text>
                    {historyData.records.filter(r => new Date(r.date).toISOString().split('T')[0] === selectedDate).length > 0 ? (
                      historyData.records
                        .filter(r => new Date(r.date).toISOString().split('T')[0] === selectedDate)
                        .map((record, index) => (
                          <View key={record.id} className={`flex-row justify-between items-center ${index > 0 ? 'border-t border-gray-100 mt-3 pt-3' : ''}`}>
                            <View>
                              <Text className="font-bold text-brand-dark">{record.address}</Text>
                              <Text className="text-gray-500 mt-1">Habitación: {record.room}</Text>
                            </View>
                            <View className="items-end">
                              <View className={`px-3 py-1 rounded-full border ${record.isVerified ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
                                <Text className={`font-bold ${record.isVerified ? 'text-green-700' : 'text-yellow-700'}`}>
                                  {record.hours}h {record.isVerified ? '✅' : '⏳'}
                                </Text>
                              </View>
                              <Text className="font-bold text-brand-primary mt-1">€{(record.hours * 10).toFixed(2)}</Text>
                            </View>
                          </View>
                        ))
                    ) : (
                      <Text className="text-gray-500 text-center py-2">No hay registros para este día.</Text>
                    )}
                  </View>
                )}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
