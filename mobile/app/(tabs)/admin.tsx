import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function AdminDashboardScreen() {
  const [data, setData] = useState<{ totalPayroll: number; dailySpending: any[]; spendingByEmployee: any[]; trafficLight: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

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

  const getMaxDailySpending = () => {
    if (!data || !data.dailySpending) return 1;
    const max = Math.max(...data.dailySpending.map(d => d.monto_total));
    return max > 0 ? max : 1;
  };

  return (
    <ScrollView className="flex-1 bg-brand-light p-4">
      <View className="flex-row justify-between items-center mb-6 mt-4">
        <Text className="text-2xl font-bold text-brand-dark">Panel Corporativo</Text>
        <TouchableOpacity onPress={logout} className="bg-red-100 p-2 rounded-lg">
          <Text className="text-red-600 font-bold">Salir</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0066FF" style={{ marginTop: 40 }} />
      ) : data ? (
        <>
          {/* Tarjeta de Nómina Mensual */}
          <View className="bg-brand-primary p-6 rounded-2xl shadow-lg mb-8">
            <Text className="text-brand-light font-medium text-base mb-1">Gasto de Nómina (Mes Actual)</Text>
            <Text className="text-white text-4xl font-black">€{data.totalPayroll.toFixed(2)}</Text>
            <View className="flex-row mt-3 items-center">
              <IconSymbol name="chart.line.uptrend.xyaxis" size={16} color="white" />
              <Text className="text-white ml-2 opacity-80 text-sm">Visualización financiera en tiempo real</Text>
            </View>
          </View>

          {/* Gráfico de Barras Simple (Gasto Diario) */}
          <View className="bg-white p-5 rounded-2xl shadow-sm mb-8 border border-gray-100">
            <Text className="text-lg font-bold text-brand-dark mb-4">Gasto de los Últimos 7 Días</Text>
            <View className="flex-row justify-between items-end h-40 pt-4">
              {data.dailySpending && data.dailySpending.map((day, index) => {
                const heightPercentage = (day.monto_total / getMaxDailySpending()) * 100;
                const dayLabel = new Date(day.fecha).toLocaleDateString('es-ES', { weekday: 'short' });
                
                return (
                  <View key={index} className="items-center flex-1">
                    <Text className="text-xs text-gray-400 mb-1 font-semibold">€{day.monto_total}</Text>
                    <View className="w-8 bg-brand-primary/20 rounded-t-lg overflow-hidden h-24 justify-end">
                      <View 
                        className="w-full bg-brand-primary rounded-t-lg" 
                        style={{ height: `${heightPercentage}%` }} 
                      />
                    </View>
                    <Text className="text-xs text-brand-dark mt-2 capitalize">{dayLabel}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Semáforo de Cumplimiento con Acumulado */}
          <Text className="text-xl font-bold text-brand-dark mb-2">Desempeño y Costos por Empleado</Text>
          <Text className="text-gray-500 mb-4 text-sm">Estado del día de hoy y costo mensual acumulado.</Text>
          
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
                    <Text className={`text-xs mt-0.5 ${
                      worker.status === 'green' ? 'text-green-600' : 
                      worker.status === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      Estado Hoy: {getStatusText(worker.status)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-gray-500 text-xs mb-0.5">Acumulado Mes</Text>
                    <Text className="text-brand-dark font-black">€{(worker.monthlyTotal || 0).toFixed(2)}</Text>
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
