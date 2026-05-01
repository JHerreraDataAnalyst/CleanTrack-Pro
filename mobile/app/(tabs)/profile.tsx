import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function formatDateES(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear] = useState<number>(now.getFullYear());
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_STATS = `http://192.168.1.137:3000/api/worker/stats/me`;

  const fetchStats = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_STATS}?workerId=${user.id}&month=${selectedMonth}&year=${selectedYear}`);
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      } else {
        console.error('Error fetching stats:', data.error);
        setStats(null);
      }
    } catch (error) {
      console.error('Error fetching personal stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (!user) return null;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0066FF"]} tintColor="#0066FF" />
        }
      >
        {/* HEADER SECTION */}
        <View className="bg-white px-6 pt-6 pb-6 shadow-sm border-b border-gray-100">
          <View className="flex-row items-center mb-5">
            <View className="w-14 h-14 rounded-2xl bg-brand-primary items-center justify-center shadow-lg">
              <Text className="text-white text-xl font-black">{user.name.charAt(0)}</Text>
            </View>
            <View className="ml-4">
              <Text className="text-xl font-bold text-gray-900">{user.name}</Text>
              <View className="bg-blue-50 px-2 py-0.5 rounded-md self-start mt-1">
                <Text className="text-brand-primary text-xs font-bold uppercase tracking-wider">{user.role}</Text>
              </View>
            </View>
          </View>

          {/* MONTH SELECTOR */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row -mx-1">
            {MONTHS.map((m, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedMonth(idx)}
                className={`px-4 py-2 rounded-full mx-1 border ${
                  selectedMonth === idx ? 'bg-brand-primary border-brand-primary' : 'bg-white border-gray-200'
                }`}
              >
                <Text className={selectedMonth === idx ? 'text-white font-bold text-sm' : 'text-gray-600 font-medium text-sm'}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="px-5 py-5">
          {loading && !refreshing ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="large" color="#0066FF" />
              <Text className="text-gray-400 mt-4 font-medium">Cargando estadísticas...</Text>
            </View>
          ) : !stats ? (
            <View className="py-20 items-center">
              <IconSymbol name="exclamationmark.triangle" size={40} color="#D1D5DB" />
              <Text className="text-gray-400 mt-3 font-medium text-center">No se pudieron cargar las estadísticas.{'\n'}Tira hacia abajo para reintentar.</Text>
            </View>
          ) : (
            <>
              {/* STATS GRID */}
              <View className="flex-row flex-wrap -mx-2 mb-6">
                {/* Hours Card */}
                <View className="w-1/2 px-2 mb-4">
                  <View className="bg-blue-500 rounded-3xl p-5 shadow-md">
                    <View className="bg-white/20 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                      <IconSymbol name="clock.fill" size={20} color="white" />
                    </View>
                    <Text className="text-white/80 text-xs font-bold uppercase mb-1">Horas del Mes</Text>
                    <Text className="text-white text-3xl font-black">{stats.totalHours || 0}h</Text>
                  </View>
                </View>

                {/* Punctuality Card */}
                <View className="w-1/2 px-2 mb-4">
                  <View className={`rounded-3xl p-5 shadow-md ${
                    (stats.punctualityIndex ?? 100) >= 80 ? 'bg-emerald-500' : 
                    (stats.punctualityIndex ?? 100) >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}>
                    <View className="bg-white/20 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                      <IconSymbol name="checkmark.seal.fill" size={20} color="white" />
                    </View>
                    <Text className="text-white/80 text-xs font-bold uppercase mb-1">Puntualidad</Text>
                    <Text className="text-white text-3xl font-black">{stats.punctualityIndex ?? 100}%</Text>
                  </View>
                </View>

                {/* Completed Card */}
                <View className="w-full px-2">
                  <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex-row items-center">
                    <View className="bg-indigo-100 w-12 h-12 rounded-2xl items-center justify-center mr-4">
                      <IconSymbol name="briefcase.fill" size={24} color="#4F46E5" />
                    </View>
                    <View>
                      <Text className="text-gray-400 text-xs font-bold uppercase">Servicios Finalizados</Text>
                      <Text className="text-gray-900 text-2xl font-black">{stats.completedServices || 0}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* RECENT HISTORY */}
              <View>
                <View className="flex-row items-center justify-between mb-4 px-1">
                  <Text className="text-lg font-bold text-gray-800">Historial de {MONTHS[selectedMonth]}</Text>
                  <Text className="text-brand-primary text-xs font-bold uppercase tracking-widest">Últimos 5</Text>
                </View>

                {!stats.recentHistory || stats.recentHistory.length === 0 ? (
                  <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-gray-200">
                    <IconSymbol name="doc.text" size={40} color="#D1D5DB" />
                    <Text className="text-gray-400 mt-2 font-medium">Sin registros en {MONTHS[selectedMonth]}</Text>
                  </View>
                ) : (
                  stats.recentHistory.map((item: any) => (
                    <View key={item.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 flex-row items-center">
                      <View className="w-12 h-12 rounded-xl bg-gray-50 items-center justify-center mr-4">
                        <IconSymbol name="house.fill" size={20} color="#94A3B8" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-800 font-bold text-sm" numberOfLines={1}>{item.address}</Text>
                        <Text className="text-gray-400 text-xs mt-0.5">
                          {item.roomName} • {formatDateES(item.date)}
                        </Text>
                      </View>
                      <View className="bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                        <Text className="text-brand-primary font-black text-sm">{item.hours}h</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* BOTTOM PAD */}
              <View className="h-10" />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
