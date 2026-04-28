import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function AdminDashboardScreen() {
  const [data, setData] = useState<{ totalPayroll: number; trafficLight: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();

  const API_URL = 'http://192.168.1.137:3000/api/work-records/dashboard';

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'green': return 'bg-brand-success';
      case 'yellow': return 'bg-brand-warning';
      case 'red': return 'bg-brand-danger';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'green': return 'Completado';
      case 'yellow': return 'Pendiente Confirmar';
      case 'red': return 'Sin Registros';
      default: return 'Desconocido';
    }
  };

  return (
    <ScrollView className="flex-1 bg-brand-light p-4">
      <View className="flex-row justify-between items-center mb-6 mt-4">
        <Text className="text-2xl font-bold text-brand-dark">Panel de Control</Text>
        <TouchableOpacity onPress={logout} className="bg-red-100 p-2 rounded-lg">
          <Text className="text-red-600 font-bold">Salir</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0066FF" className="mt-10" />
      ) : data ? (
        <>
          {/* Tarjeta de Nómina */}
          <View className="bg-brand-primary p-6 rounded-2xl shadow-lg mb-8">
            <Text className="text-brand-light font-medium text-base mb-1">Gasto Total Acumulado (Hoy)</Text>
            <Text className="text-white text-4xl font-black">€{data.totalPayroll.toFixed(2)}</Text>
          </View>

          {/* Semáforo de Cumplimiento */}
          <Text className="text-xl font-bold text-brand-dark mb-4">Semáforo de Cumplimiento</Text>
          <Text className="text-gray-500 mb-4 text-sm">Estado de los trabajadores con turno programado para hoy.</Text>
          
          <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
            {data.trafficLight.length === 0 ? (
              <View className="p-6 items-center">
                <Text className="text-gray-500">No hay trabajadores con turnos hoy.</Text>
              </View>
            ) : (
              data.trafficLight.map((worker, index) => (
                <View 
                  key={worker.workerId} 
                  className={`flex-row items-center p-4 ${index !== data.trafficLight.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <View className={`w-3 h-3 rounded-full mr-4 ${getStatusColor(worker.status)}`} />
                  <View className="flex-1">
                    <Text className="text-brand-dark font-semibold text-lg">{worker.workerName}</Text>
                    <Text className={`text-sm ${
                      worker.status === 'green' ? 'text-green-600' : 
                      worker.status === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {getStatusText(worker.status)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      ) : (
        <Text className="text-center text-gray-500 mt-10">No se encontraron datos.</Text>
      )}
    </ScrollView>
  );
}
