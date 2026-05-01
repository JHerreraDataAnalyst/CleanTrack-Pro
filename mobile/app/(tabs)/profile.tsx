import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const API_BASE = 'http://192.168.1.137:3000';

function formatDateES(dateStr: string): string {
  try {
    // Parse the ISO string and format in Spanish locale
    // Use UTC methods to avoid timezone shift turning 2026-01-31 into Jan 30
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

interface WorkerStats {
  totalHours: number;
  punctualityIndex: number;
  completedServices: number;
  recentHistory: Array<{
    id: string;
    roomName: string;
    address: string;
    hours: number;
    date: string;
    createdAt: string;
  }>;
  period: { month: number; year: number };
}

const EMPTY_STATS: WorkerStats = {
  totalHours: 0,
  punctualityIndex: 100,
  completedServices: 0,
  recentHistory: [],
  period: { month: 0, year: 0 },
};

async function fetchWorkerStats(
  workerId: string,
  month: number,
  year: number,
): Promise<WorkerStats> {
  const url = `${API_BASE}/api/worker/stats/me?workerId=${encodeURIComponent(workerId)}&month=${month}&year=${year}`;
  const response = await fetch(url);

  // If no records exist for the period, backend returns 200 with zeros.
  // Only throw for actual server errors (5xx) or network failures.
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stats error ${response.status}: ${text}`);
  }

  const data = await response.json();

  // Normalise: always return a complete object even if backend omits fields
  return {
    totalHours: data.totalHours ?? 0,
    punctualityIndex: data.punctualityIndex ?? 100,
    completedServices: data.completedServices ?? 0,
    recentHistory: data.recentHistory ?? [],
    period: data.period ?? { month, year },
  };
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear] = useState<number>(now.getFullYear());

  const {
    data: stats,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<WorkerStats>({
    // queryKey includes month + year — changes invalidate cache and trigger refetch
    queryKey: ['workerStats', user?.id, selectedMonth, selectedYear],
    queryFn: () => fetchWorkerStats(user!.id, selectedMonth, selectedYear),
    enabled: !!user,
    // Return zeros instead of showing an error when a month simply has no records
    placeholderData: EMPTY_STATS,
    retry: 1,
    staleTime: 60_000, // 1 minute cache per month
  });

  if (!user) return null;

  const displayStats = stats ?? EMPTY_STATS;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            colors={['#0066FF']}
            tintColor="#0066FF"
          />
        }
      >
        {/* ── HEADER ── */}
        <View className="bg-white px-6 pt-6 pb-6 shadow-sm border-b border-gray-100">
          <View className="flex-row items-center mb-5">
            <View className="w-14 h-14 rounded-2xl bg-brand-primary items-center justify-center shadow-lg">
              <Text className="text-white text-xl font-black">{user.name.charAt(0)}</Text>
            </View>
            <View className="ml-4">
              <Text className="text-xl font-bold text-gray-900">{user.name}</Text>
              <View className="bg-blue-50 px-2 py-0.5 rounded-md self-start mt-1">
                <Text className="text-brand-primary text-xs font-bold uppercase tracking-wider">
                  {user.role}
                </Text>
              </View>
            </View>
          </View>

          {/* ── MONTH SELECTOR ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row -mx-1"
          >
            {MONTHS.map((m, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedMonth(idx)}
                className={`px-4 py-2 rounded-full mx-1 border ${
                  selectedMonth === idx
                    ? 'bg-brand-primary border-brand-primary'
                    : 'bg-white border-gray-200'
                }`}
              >
                <Text
                  className={
                    selectedMonth === idx
                      ? 'text-white font-bold text-sm'
                      : 'text-gray-600 font-medium text-sm'
                  }
                >
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── CONTENT ── */}
        <View className="px-5 py-5">
          {isLoading && !isRefetching ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="large" color="#0066FF" />
              <Text className="text-gray-400 mt-4 font-medium">
                Cargando estadísticas...
              </Text>
            </View>
          ) : isError ? (
            /* Only show error state for actual server/network failures,
               not for months with zero records */
            <View className="py-20 items-center">
              <IconSymbol name="wifi.slash" size={40} color="#D1D5DB" />
              <Text className="text-gray-400 mt-3 font-medium text-center">
                No se pudo conectar al servidor.{'\n'}Tira hacia abajo para reintentar.
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                className="mt-5 bg-brand-primary px-6 py-3 rounded-xl"
              >
                <Text className="text-white font-bold">Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ── STATS GRID ── */}
              <View className="flex-row flex-wrap -mx-2 mb-6">
                {/* Hours */}
                <View className="w-1/2 px-2 mb-4">
                  <View className="bg-blue-500 rounded-3xl p-5 shadow-md">
                    <View className="bg-white/20 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                      <IconSymbol name="clock.fill" size={20} color="white" />
                    </View>
                    <Text className="text-white/80 text-xs font-bold uppercase mb-1">
                      Horas del Mes
                    </Text>
                    <Text className="text-white text-3xl font-black">
                      {displayStats.totalHours}h
                    </Text>
                  </View>
                </View>

                {/* Punctuality — colour changes by score */}
                <View className="w-1/2 px-2 mb-4">
                  <View
                    className={`rounded-3xl p-5 shadow-md ${
                      displayStats.punctualityIndex >= 80
                        ? 'bg-emerald-500'
                        : displayStats.punctualityIndex >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  >
                    <View className="bg-white/20 w-10 h-10 rounded-2xl items-center justify-center mb-3">
                      <IconSymbol name="checkmark.seal.fill" size={20} color="white" />
                    </View>
                    <Text className="text-white/80 text-xs font-bold uppercase mb-1">
                      Puntualidad
                    </Text>
                    <Text className="text-white text-3xl font-black">
                      {displayStats.punctualityIndex}%
                    </Text>
                  </View>
                </View>

                {/* Completed services */}
                <View className="w-full px-2">
                  <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex-row items-center">
                    <View className="bg-indigo-100 w-12 h-12 rounded-2xl items-center justify-center mr-4">
                      <IconSymbol name="briefcase.fill" size={24} color="#4F46E5" />
                    </View>
                    <View>
                      <Text className="text-gray-400 text-xs font-bold uppercase">
                        Servicios Finalizados
                      </Text>
                      <Text className="text-gray-900 text-2xl font-black">
                        {displayStats.completedServices}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ── RECENT HISTORY ── */}
              <View>
                <View className="flex-row items-center justify-between mb-4 px-1">
                  <Text className="text-lg font-bold text-gray-800">
                    Historial — {MONTHS[selectedMonth]} {selectedYear}
                  </Text>
                  <Text className="text-brand-primary text-xs font-bold uppercase tracking-widest">
                    Últimos 5
                  </Text>
                </View>

                {displayStats.recentHistory.length === 0 ? (
                  <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-gray-200">
                    <IconSymbol name="doc.text" size={40} color="#D1D5DB" />
                    <Text className="text-gray-400 mt-2 font-medium">
                      Sin registros en {MONTHS[selectedMonth]}
                    </Text>
                  </View>
                ) : (
                  displayStats.recentHistory.map((item) => (
                    <View
                      key={item.id}
                      className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 flex-row items-center"
                    >
                      <View className="w-12 h-12 rounded-xl bg-gray-50 items-center justify-center mr-4">
                        <IconSymbol name="house.fill" size={20} color="#94A3B8" />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-gray-800 font-bold text-sm"
                          numberOfLines={1}
                        >
                          {item.address}
                        </Text>
                        <Text className="text-gray-400 text-xs mt-0.5">
                          {item.roomName} • {formatDateES(item.date)}
                        </Text>
                      </View>
                      <View className="bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                        <Text className="text-brand-primary font-black text-sm">
                          {item.hours}h
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              <View className="h-10" />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
