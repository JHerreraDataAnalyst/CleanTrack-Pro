import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Modal, FlatList, StyleSheet, Dimensions } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Agenda, LocaleConfig } from 'react-native-calendars';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { BarChart, PieChart } from 'react-native-chart-kit';

// Configuración en español para el calendario
LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar', 'Abr', 'May', 'Jun', 'Jul.', 'Ago', 'Sept.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const AGENDA_START_DATE = new Date('2026-04-28').toISOString().split('T')[0];

const AGENDA_THEME = {
  agendaDayTextColor: '#6B7280',
  agendaDayNumColor: '#0066FF',
  agendaTodayColor: '#0066FF',
  agendaKnobColor: '#0066FF',
  backgroundColor: '#F3F4F6',
  calendarBackground: '#ffffff'
};

// ─── Inner component: all hooks live here, rendered only for ADMIN users ───────
// Separating hooks into an inner component ensures that:
// 1. React Hooks Rules are never violated (no hooks after conditional return)
// 2. The React Compiler can optimize hooks calls safely
// 3. react-native-css-interop never encounters an inconsistent hook count
function AdminDashboardInner({ logout }: { logout: () => void }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planner' | 'reports'>('dashboard');

  // DASHBOARD STATE
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  // STATS STATE
  const [statsData, setStatsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const screenWidth = Dimensions.get('window').width - 48; // Padding 24 cada lado

  // PLANNER STATE
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [items, setItems] = useState<any>({});
  const [loadingPlanner, setLoadingPlanner] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [currentAgendaMonth, setCurrentAgendaMonth] = useState<any>(null);

  // REPORTS STATE
  const [reportPeriod, setReportPeriod] = useState<'current_month' | 'last_month'>('current_month');
  const [reportEmployee, setReportEmployee] = useState<string>('all');
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // API URLs
  const API_DASHBOARD = 'http://192.168.1.137:3000/api/work-records/dashboard';
  const API_ADMIN = 'http://192.168.1.137:3000/api/admin';
  const API_STATS = 'http://192.168.1.137:3000/api/admin/stats/dashboard';

  // FETCH DASHBOARD (legacy payroll data)
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
      fetchStatsData();
    }
  }, [activeTab, selectedMonth]);

  const fetchStatsData = async () => {
    setLoadingStats(true);
    try {
      const response = await fetch(`${API_STATS}?month=${selectedMonth}&year=2026`);
      const json = await response.json();
      setStatsData(json);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoadingDashboard(true);
    try {
      // 2026 for historical simulation
      const response = await fetch(`${API_DASHBOARD}?month=${selectedMonth}&year=2026`);
      const json = await response.json();
      setDashboardData(json);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del dashboard');
    } finally {
      setLoadingDashboard(false);
    }
  };

  // FETCH PLANNER EMPLOYEES & ADDRESSES
  useEffect(() => {
    if (activeTab === 'planner') {
      fetchEmployees();
      fetchAddresses();
    }
  }, [activeTab]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_ADMIN}/employees`);
      const data = await res.json();
      setEmployees(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await fetch(`${API_ADMIN}/addresses`);
      const data = await res.json();
      setAddresses(data);
    } catch (e) {
      console.error(e);
    }
  };

  // FETCH REPORTS
  const getReportDates = () => {
    const now = new Date();
    // Use 2026 for simulation as it matches the global setup
    const currentYear = 2026;
    let startDate: string, endDate: string;
    
    if (reportPeriod === 'current_month') {
      startDate = new Date(currentYear, now.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(currentYear, now.getMonth() + 1, 0).toISOString().split('T')[0];
    } else {
      startDate = new Date(currentYear, now.getMonth() - 1, 1).toISOString().split('T')[0];
      endDate = new Date(currentYear, now.getMonth(), 0).toISOString().split('T')[0];
    }
    return { startDate, endDate };
  };

  const fetchReportData = async () => {
    setLoadingReport(true);
    try {
      const { startDate, endDate } = getReportDates();
      let url = `${API_ADMIN}/reports/export?startDate=${startDate}&endDate=${endDate}`;
      if (reportEmployee !== 'all') {
        url += `&workerId=${reportEmployee}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReportData(data);
    } catch (e) {
      console.error('Error fetching reports', e);
      Alert.alert('Error', 'No se pudieron cargar los datos del reporte');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReportData();
      if (employees.length === 0) fetchEmployees();
    }
  }, [activeTab, reportPeriod, reportEmployee]);

  const handleExportCSV = async () => {
    try {
      const { startDate, endDate } = getReportDates();
      let url = `${API_ADMIN}/reports/export?startDate=${startDate}&endDate=${endDate}&format=csv`;
      if (reportEmployee !== 'all') {
        url += `&workerId=${reportEmployee}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const text = await res.text();
      
      const fileUri = `${FileSystem.documentDirectory}reporte_cleantrack_${startDate}_${endDate}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, text, { encoding: FileSystem.EncodingType.UTF8 });
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exportar Reporte CSV'
        });
      } else {
        Alert.alert('Error', 'La función de compartir no está disponible en este dispositivo');
      }
    } catch (e) {
      console.error('Export CSV error', e);
      Alert.alert('Error', 'Error al generar o exportar el archivo CSV');
    }
  };

  // FETCH ASSIGNMENTS FOR AGENDA
  const currentAgendaMonthRef = React.useRef<any>(null);
  const loadedMonthsRef = React.useRef<Record<string, string>>({}); // Tracks loaded employee filter per month

  const loadItems = useCallback(async (day: any, forceReload = false) => {
    currentAgendaMonthRef.current = day;

    const monthKey = `${day.year}-${String(day.month).padStart(2, '0')}`;

    // Prevents Agenda infinite loop: 
    // If we already loaded this exact month for this exact employee, ignore.
    if (!forceReload && loadedMonthsRef.current[monthKey] === selectedEmployee) {
      return;
    }

    // Mark as loading/loaded to prevent duplicate requests
    loadedMonthsRef.current[monthKey] = selectedEmployee;

    // Set loading state asynchronously to break the React synchronous update cycle
    setTimeout(() => setLoadingPlanner(true), 0);

    try {
      const startOfMonth = new Date(Date.UTC(day.year, day.month - 1, 1)).toISOString().split('T')[0];
      const endOfMonth = new Date(Date.UTC(day.year, day.month, 0)).toISOString().split('T')[0];
      
      const res = await fetch(`${API_ADMIN}/assignments?startDate=${startOfMonth}&endDate=${endOfMonth}&userId=${selectedEmployee}`);
      const data = await res.json();
      
      const newItems: any = {};
      
      // Initialize all days of the month with empty arrays (prevents missing date errors)
      for (let i = 1; i <= new Date(day.year, day.month, 0).getDate(); i++) {
        const dateStr = `${day.year}-${String(day.month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        newItems[dateStr] = [];
      }

      data.forEach((item: any) => {
        const dateStr = item.date.split('T')[0];
        if (!newItems[dateStr]) newItems[dateStr] = [];
        newItems[dateStr].push(item);
      });

      // Maintain past loaded items cache and inject new month
      setItems((prev: any) => ({ ...prev, ...newItems }));
    } catch (e) {
      console.error(e);
      // Revert cache on error to allow retry
      loadedMonthsRef.current[monthKey] = '';
    } finally {
      setTimeout(() => setLoadingPlanner(false), 0);
    }
  }, [selectedEmployee]);

  // Reload agenda when filter changes
  useEffect(() => {
    if (activeTab === 'planner' && currentAgendaMonthRef.current) {
      // Force reload the currently visible month without clearing `items`.
      // Clearing `items` completely causes Agenda to panic and loop.
      loadItems(currentAgendaMonthRef.current, true);
    }
  }, [selectedEmployee]);

  const handleAssign = async (addressId: string) => {
    if (selectedEmployee === 'all') {
      Alert.alert('Error', 'Debes filtrar a un empleado específico antes de asignar una sede.');
      return;
    }
    
    setIsModalVisible(false);
    setLoadingPlanner(true);
    try {
      // Tomamos el día seleccionado o el día de hoy si no hay ninguno visible
      const currentMonth = currentAgendaMonthRef.current;
      const dateToAssign = currentMonth 
        ? `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}-${String(currentMonth.day || 1).padStart(2, '0')}`
        : new Date().toISOString().split('T')[0];

      const res = await fetch(`${API_ADMIN}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedEmployee,
          addressId,
          date: dateToAssign
        })
      });
      if (res.ok) {
        if (currentMonth) loadItems(currentMonth);
      } else {
        Alert.alert('Error', 'No se pudo crear la asignación');
        setLoadingPlanner(false);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Error de red');
      setLoadingPlanner(false);
    }
  };

  const handleDeleteAssignment = useCallback(async (id: string) => {
    Alert.alert(
      "Eliminar Asignación",
      "¿Estás seguro de que deseas eliminar esta asignación?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: async () => {
            setLoadingPlanner(true);
            try {
              const res = await fetch(`${API_ADMIN}/assignments/${id}`, { method: 'DELETE' });
              if (res.ok) {
                if (currentAgendaMonthRef.current) loadItems(currentAgendaMonthRef.current);
              } else {
                const errorData = await res.json();
                Alert.alert('Acción Bloqueada', errorData.error || 'No se pudo eliminar');
                setLoadingPlanner(false);
              }
            } catch (e) {
              console.error(e);
              Alert.alert('Error', 'Error de red al conectar con el servidor.');
              setLoadingPlanner(false);
            }
          }
        }
      ]
    );
  }, [loadItems]);

  // DASHBOARD HELPERS
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
      case 'green': return 'Verificado Total';
      case 'yellow': return 'Parcial / Pendiente';
      case 'red': return 'Sin Registros';
      default: return 'Sin Asignaciones';
    }
  };

  const getMaxDailySpending = () => {
    if (!dashboardData || !dashboardData.dailySpending) return 1;
    const max = Math.max(...dashboardData.dailySpending.map((d: any) => d.monto_total));
    return max > 0 ? max : 1;
  };

  const rowHasChangedMemo = useCallback((r1: any, r2: any) => {
    if (!r1 || !r2) return r1 !== r2;
    return r1.id !== r2.id;
  }, []);
  
  const renderEmptyDateMemo = useCallback(() => (
    <View className="flex-1 justify-center py-6 px-4 mr-4 my-2 border-t border-gray-100">
      <Text className="text-gray-400 text-center text-sm font-medium">No hay asignaciones este día.</Text>
    </View>
  ), []);

  const renderAgendaItem = useCallback((item: any) => {
    return (
      <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 my-2 mr-4 flex-row justify-between items-center">
        <View className="flex-1 pr-3">
          <Text className="text-brand-dark font-bold text-base mb-1" numberOfLines={1}>
            {item.address.street}
          </Text>
          <View className="flex-row items-center mt-1">
            <IconSymbol name="person.fill" size={14} color="#6B7280" />
            <Text className="text-gray-500 text-xs ml-1 flex-1" numberOfLines={1}>
              {item.worker?.name}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => handleDeleteAssignment(item.id)}
          className="bg-red-50 p-3 rounded-xl border border-red-100"
        >
          <IconSymbol name="xmark" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  }, [handleDeleteAssignment]);
  return (
    <View className="flex-1 bg-brand-light">
      <View className="p-4 pb-2">
        {/* HEADER */}
        <View className="flex-row justify-between items-center mb-4 mt-4">
          <Text className="text-2xl font-bold text-brand-dark">Centro de Operaciones</Text>
          <TouchableOpacity onPress={logout} className="bg-red-100 p-2 px-3 rounded-lg flex-row items-center">
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={16} color="#DC2626" />
            <Text className="text-red-600 font-bold ml-2">Salir</Text>
          </TouchableOpacity>
        </View>

        {/* TOGGLE */}
        <View className="flex-row bg-gray-200 rounded-xl p-1 mb-2">
          <TouchableOpacity
            className={activeTab === 'dashboard' ? 'flex-1 py-2 rounded-lg items-center bg-white shadow-sm' : 'flex-1 py-2 rounded-lg items-center'}
            onPress={() => setActiveTab('dashboard')}
          >
            <Text className={activeTab === 'dashboard' ? 'font-bold text-brand-primary' : 'font-bold text-gray-500'}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={activeTab === 'planner' ? 'flex-1 py-2 rounded-lg items-center bg-white shadow-sm' : 'flex-1 py-2 rounded-lg items-center'}
            onPress={() => setActiveTab('planner')}
          >
            <Text className={activeTab === 'planner' ? 'font-bold text-brand-primary' : 'font-bold text-gray-500'}>Agenda</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={activeTab === 'reports' ? 'flex-1 py-2 rounded-lg items-center bg-white shadow-sm' : 'flex-1 py-2 rounded-lg items-center'}
            onPress={() => setActiveTab('reports')}
          >
            <Text className={activeTab === 'reports' ? 'font-bold text-brand-primary' : 'font-bold text-gray-500'}>Reportes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* DASHBOARD VIEW */}
      {activeTab === 'dashboard' && (
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          {/* MONTH SELECTOR */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 mt-2 -mx-1">
            {MONTHS.map((m, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => { setSelectedMonth(idx); }}
                className={`px-4 py-2 rounded-full mr-2 border shadow-sm ${
                  selectedMonth === idx ? 'bg-brand-primary border-brand-primary' : 'bg-white border-gray-200'
                }`}
              >
                <Text className={selectedMonth === idx ? 'text-white font-bold text-sm' : 'text-gray-600 font-medium text-sm'}>
                  {m} 2026
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {(loadingDashboard || loadingStats) ? (
            <View className="flex-1 items-center justify-center py-20">
              <ActivityIndicator size="large" color="#1E3A8A" />
              <Text className="text-gray-500 mt-3 font-medium">Cargando estadísticas...</Text>
            </View>
          ) : (
            <>
              {/* ── HERO CARD: Global Punctuality ──────────────────────────── */}
              {statsData && (
                <View className="rounded-3xl overflow-hidden mb-6 shadow-lg" style={{ backgroundColor: '#1E3A8A' }}>
                  <View className="p-6">
                    <Text className="text-blue-200 font-semibold text-sm mb-1 uppercase tracking-wider">Índice de Puntualidad Global</Text>
                    <Text className="text-white text-5xl font-black">{statsData.globalPunctuality.onTimePercent}%</Text>
                    <Text className="text-blue-200 text-sm mt-1">{MONTHS[selectedMonth]} 2026 • {statsData.globalPunctuality.total} registros</Text>
                    <View className="flex-row mt-4 gap-4">
                      <View className="flex-row items-center">
                        <View className="w-3 h-3 rounded-full bg-emerald-400 mr-2" />
                        <Text className="text-white text-sm">{statsData.globalPunctuality.onTime} a tiempo</Text>
                      </View>
                      <View className="flex-row items-center">
                        <View className="w-3 h-3 rounded-full bg-rose-400 mr-2" />
                        <Text className="text-white text-sm">{statsData.globalPunctuality.late} tardíos</Text>
                      </View>
                    </View>
                  </View>

                  {/* Donut-style progress bar */}
                  <View className="mx-6 mb-6">
                    <View className="h-3 bg-blue-900 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-emerald-400 rounded-full"
                        style={{ width: `${statsData.globalPunctuality.onTimePercent}%` }}
                      />
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-blue-300 text-xs">0%</Text>
                      <Text className="text-blue-300 text-xs">100%</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* ── DONUT CHART: Pie de Puntualidad ──────────────────────── */}
              {statsData && statsData.globalPunctuality.total > 0 && (
                <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
                  <Text className="text-lg font-bold text-gray-800 mb-1">Desglose de Puntualidad</Text>
                  <Text className="text-gray-500 text-sm mb-4">Reportes a tiempo vs. tardíos</Text>
                  <View className="items-center">
                    <PieChart
                      data={[
                        {
                          name: 'A Tiempo',
                          population: statsData.globalPunctuality.onTime,
                          color: '#10B981',
                          legendFontColor: '#374151',
                          legendFontSize: 13,
                        },
                        {
                          name: 'Tardíos',
                          population: Math.max(statsData.globalPunctuality.late, 1),
                          color: '#F43F5E',
                          legendFontColor: '#374151',
                          legendFontSize: 13,
                        },
                      ]}
                      width={screenWidth - 16}
                      height={180}
                      chartConfig={{
                        color: (opacity = 1) => `rgba(30, 58, 138, ${opacity})`,
                        backgroundColor: '#ffffff',
                        backgroundGradientFrom: '#ffffff',
                        backgroundGradientTo: '#ffffff',
                      }}
                      accessor="population"
                      backgroundColor="transparent"
                      paddingLeft="10"
                      absolute={false}
                    />
                  </View>
                </View>
              )}

              {/* ── BAR CHART: Horas por Trabajador ──────────────────────── */}
              {statsData && statsData.hoursPerWorker.length > 0 && (
                <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
                  <Text className="text-lg font-bold text-gray-800 mb-1">Horas por Empleado</Text>
                  <Text className="text-gray-500 text-sm mb-4">Total de horas trabajadas en el período</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <BarChart
                      data={{
                        labels: statsData.hoursPerWorker.map((w: any) =>
                          w.workerName.split(' ')[0]
                        ),
                        datasets: [
                          {
                            data: statsData.hoursPerWorker.map((w: any) => w.totalHours || 0),
                          },
                        ],
                      }}
                      width={Math.max(screenWidth, statsData.hoursPerWorker.length * 80)}
                      height={200}
                      chartConfig={{
                        backgroundColor: '#1E3A8A',
                        backgroundGradientFrom: '#1E3A8A',
                        backgroundGradientTo: '#2563EB',
                        decimalPlaces: 1,
                        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        style: { borderRadius: 16 },
                      }}
                      style={{ borderRadius: 16 }}
                      fromZero
                      showValuesOnTopOfBars
                      yAxisLabel=""
                      yAxisSuffix="h"
                      withInnerLines={false}
                    />
                  </ScrollView>
                  {/* Tooltip */}

                  {/* Leyenda custom */}
                  <View className="flex-row flex-wrap mt-4 gap-2">
                    {statsData.hoursPerWorker.map((w: any) => (
                      <View key={w.workerId} className="flex-row items-center bg-blue-50 px-3 py-1.5 rounded-full">
                        <View className="w-2.5 h-2.5 rounded-full bg-brand-primary mr-2" />
                        <Text className="text-brand-primary text-xs font-semibold">{w.workerName.split(' ')[0]}: {w.totalHours}h</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* ── ISSUE HOTSPOTS: Ranking de Alertas ───────────────────── */}
              {statsData && (
                <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6">
                  <View className="flex-row items-center mb-4">
                    <View className="w-8 h-8 rounded-full bg-rose-100 items-center justify-center mr-3">
                      <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#F43F5E" />
                    </View>
                    <View>
                      <Text className="text-lg font-bold text-gray-800">Hotspots de Incidencias</Text>
                      <Text className="text-gray-500 text-sm">Sitios con más problemas reportados</Text>
                    </View>
                  </View>

                  {statsData.issueHotspots.length === 0 ? (
                    <View className="py-8 items-center">
                      <IconSymbol name="checkmark.circle.fill" size={40} color="#10B981" />
                      <Text className="text-green-600 font-bold mt-2">Sin incidencias este período</Text>
                    </View>
                  ) : (
                    statsData.issueHotspots.map((site: any, idx: number) => {
                      const maxCount = statsData.issueHotspots[0].issueCount || 1;
                      const barWidth = (site.issueCount / maxCount) * 100;
                      const colors = ['#F43F5E', '#FB7185', '#FDA4AF', '#FECDD3', '#FFF1F2'];
                      return (
                        <View key={site.siteId} className="mb-4">
                          <View className="flex-row justify-between items-start mb-1">
                            <View className="flex-row items-center flex-1 mr-2">
                              <Text className="text-xs font-black text-gray-400 mr-2 w-4">#{idx + 1}</Text>
                              <Text className="text-gray-800 font-semibold text-sm flex-1" numberOfLines={1}>
                                {site.street}
                              </Text>
                            </View>
                            <View className="bg-rose-100 px-2 py-0.5 rounded-full">
                              <Text className="text-rose-600 font-black text-xs">{site.issueCount} incid.</Text>
                            </View>
                          </View>
                          <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <View
                              className="h-full rounded-full"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: colors[idx] || '#F43F5E',
                              }}
                            />
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* ── SITE WORKLOAD ─────────────────────────────────────────── */}
              {statsData && statsData.siteWorkload.length > 0 && (
                <View className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-8">
                  <Text className="text-lg font-bold text-gray-800 mb-1">Carga por Sede</Text>
                  <Text className="text-gray-500 text-sm mb-4">Horas acumuladas en el período por dirección</Text>
                  {statsData.siteWorkload.map((site: any, idx: number) => {
                    const maxHours = statsData.siteWorkload[0].totalHours || 1;
                    const barWidth = (site.totalHours / maxHours) * 100;
                    return (
                      <View key={site.siteId} className="mb-3">
                        <View className="flex-row justify-between mb-1">
                          <Text className="text-gray-700 text-sm font-medium flex-1 mr-2" numberOfLines={1}>
                            {site.street}
                          </Text>
                          <Text className="text-brand-primary font-bold text-sm">{site.totalHours}h</Text>
                        </View>
                        <View className="h-2 bg-blue-50 rounded-full overflow-hidden">
                          <View
                            className="h-full bg-brand-primary rounded-full"
                            style={{ width: `${barWidth}%` }}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* ── LEGACY: Payroll card ─────────────────────────────────── */}
              {dashboardData && (
                <View className="bg-brand-primary p-6 rounded-2xl shadow-lg mb-8">
                  <Text className="text-blue-200 font-medium text-sm mb-1">Nómina Estimada ({MONTHS[selectedMonth]})</Text>
                  <Text className="text-white text-4xl font-black">€{dashboardData.totalPayroll?.toFixed(2) ?? '0.00'}</Text>
                  <View className="flex-row mt-3 items-center">
                    <IconSymbol name="chart.line.uptrend.xyaxis" size={16} color="white" />
                    <Text className="text-white ml-2 opacity-80 text-sm">Registro histórico consolidado</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* PLANNER VIEW (AGENDA) */}
      {activeTab === 'planner' && (
        <View className="flex-1">
          <View className="px-4 pb-3 flex-row justify-between items-center bg-brand-light">
            <TouchableOpacity 
              className="bg-white border border-gray-200 px-4 py-2 rounded-lg flex-row items-center shadow-sm"
              onPress={() => setIsFilterModalVisible(true)}
            >
              <IconSymbol name="building.2.fill" size={16} color="#0066FF" />
              <Text className="font-bold text-brand-dark ml-2">
                Filtro: {selectedEmployee === 'all' ? 'Todos' : employees.find(e => e.id === selectedEmployee)?.name}
              </Text>
            </TouchableOpacity>
            
            {loadingPlanner && <ActivityIndicator size="small" color="#0066FF" />}
          </View>
          
          <Agenda
            key={`agenda-${selectedEmployee}`}
            items={items}
            loadItemsForMonth={loadItems}
            selected={AGENDA_START_DATE}
            renderItem={renderAgendaItem}
            rowHasChanged={rowHasChangedMemo}
            renderEmptyDate={renderEmptyDateMemo}
            theme={AGENDA_THEME}
            showOnlySelectedDayItems={true}
          />

          {/* FLOATING ACTION BUTTON (FAB) FOR PLANNER */}
          {selectedEmployee !== 'all' && (
            <TouchableOpacity 
              className="absolute bottom-6 right-6 w-16 h-16 bg-brand-primary rounded-full items-center justify-center shadow-lg border-2 border-white"
              style={{ elevation: 5 }}
              onPress={() => setIsModalVisible(true)}
            >
              <IconSymbol name="plus" size={30} color="white" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* REPORTS VIEW */}
      {activeTab === 'reports' && (
        <ScrollView className="flex-1 px-4">
          <Text className="text-xl font-bold text-brand-dark mt-4 mb-4">Exportar Reportes CSV</Text>
          
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
            <Text className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Período de Tiempo</Text>
            <View className="flex-row">
              <TouchableOpacity
                className={`flex-1 p-3 rounded-xl border ${reportPeriod === 'current_month' ? 'bg-blue-50 border-brand-primary' : 'bg-gray-50 border-gray-200'} mr-2`}
                onPress={() => setReportPeriod('current_month')}
              >
                <Text className={`text-center font-bold ${reportPeriod === 'current_month' ? 'text-brand-primary' : 'text-gray-600'}`}>Este Mes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 p-3 rounded-xl border ${reportPeriod === 'last_month' ? 'bg-blue-50 border-brand-primary' : 'bg-gray-50 border-gray-200'}`}
                onPress={() => setReportPeriod('last_month')}
              >
                <Text className={`text-center font-bold ${reportPeriod === 'last_month' ? 'text-brand-primary' : 'text-gray-600'}`}>Mes Pasado</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
            <Text className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Trabajador</Text>
            <View className="border border-gray-200 rounded-xl overflow-hidden">
              <TouchableOpacity 
                className={`p-3 border-b border-gray-100 ${reportEmployee === 'all' ? 'bg-blue-50' : 'bg-white'}`}
                onPress={() => setReportEmployee('all')}
              >
                <Text className={`font-semibold ${reportEmployee === 'all' ? 'text-brand-primary' : 'text-gray-700'}`}>Todos los Trabajadores</Text>
              </TouchableOpacity>
              {employees.map((emp) => (
                <TouchableOpacity 
                  key={emp.id}
                  className={`p-3 border-b border-gray-100 ${reportEmployee === emp.id ? 'bg-blue-50' : 'bg-white'}`}
                  onPress={() => setReportEmployee(emp.id)}
                >
                  <Text className={`font-semibold ${reportEmployee === emp.id ? 'text-brand-primary' : 'text-gray-700'}`}>{emp.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loadingReport ? (
            <ActivityIndicator size="large" color="#0066FF" style={{ marginVertical: 40 }} />
          ) : reportData ? (
            <View className="mb-10">
              <Text className="text-lg font-bold text-brand-dark mb-3">Resumen de Datos</Text>
              
              <View className="flex-row mb-4">
                <View className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mr-2">
                  <IconSymbol name="clock.fill" size={24} color="#0066FF" />
                  <Text className="text-gray-500 mt-2 font-medium">Horas Totales</Text>
                  <Text className="text-2xl font-black text-brand-dark mt-1">{reportData.summary.totalHours}</Text>
                </View>
                <View className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <IconSymbol name="checkmark.seal.fill" size={24} color="#10B981" />
                  <Text className="text-gray-500 mt-2 font-medium">Puntualidad</Text>
                  <Text className="text-2xl font-black text-brand-dark mt-1">{reportData.summary.punctualityIndex}%</Text>
                </View>
              </View>

              <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
                <Text className="text-gray-600 mb-2">Registros A Tiempo: <Text className="font-bold text-green-600">{reportData.summary.onTimeCount}</Text></Text>
                <Text className="text-gray-600">Registros Tardíos: <Text className="font-bold text-red-600">{reportData.summary.lateCount}</Text></Text>
              </View>

              <TouchableOpacity 
                className="bg-brand-primary p-4 rounded-xl flex-row justify-center items-center shadow-md mb-8"
                onPress={handleExportCSV}
              >
                <IconSymbol name="arrow.down.doc.fill" size={20} color="white" />
                <Text className="text-white font-bold text-lg ml-2">Exportar a CSV</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      )}

      {/* MODAL CATALOGO DE SEDES */}
      <Modal visible={isModalVisible} animationType="slide" presentationStyle="formSheet">
        <View className="flex-1 bg-brand-light">
          <View className="flex-row justify-between items-center p-5 bg-white border-b border-gray-100 shadow-sm">
            <Text className="text-xl font-bold text-brand-dark">Seleccionar Sede</Text>
            <TouchableOpacity onPress={() => setIsModalVisible(false)} className="bg-gray-100 p-2 px-4 rounded-lg">
              <Text className="text-gray-600 font-bold">Cerrar</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={addresses}
            keyExtractor={item => item.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity 
                className="bg-white p-5 rounded-2xl shadow-sm mb-3 border border-gray-100 flex-row justify-between items-center"
                onPress={() => handleAssign(item.id)}
              >
                <View className="flex-1 pr-4">
                  <Text className="font-bold text-brand-dark text-lg mb-1">{item.street}</Text>
                  <Text className="text-gray-500">{item.city} {item.zipCode ? ` - ${item.zipCode}` : ''}</Text>
                </View>
                <View className="bg-blue-50 w-10 h-10 rounded-full items-center justify-center">
                  <IconSymbol name="plus" size={20} color="#0066FF" />
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* MODAL FILTRO DE EMPLEADOS */}
      <Modal visible={isFilterModalVisible} animationType="fade" transparent={true}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl pt-5 pb-8 px-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-brand-dark">Filtrar por Empleado</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <IconSymbol name="xmark" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity 
                className={`p-4 rounded-xl mb-2 flex-row justify-between items-center ${selectedEmployee === 'all' ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}
                onPress={() => {
                  setSelectedEmployee('all');
                  setIsFilterModalVisible(false);
                }}
              >
                <Text className={`font-bold ${selectedEmployee === 'all' ? 'text-brand-primary' : 'text-gray-700'}`}>Ver Todos</Text>
              </TouchableOpacity>

              {employees.map(emp => (
                <TouchableOpacity 
                  key={emp.id}
                  className={`p-4 rounded-xl mb-2 flex-row justify-between items-center ${selectedEmployee === emp.id ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}
                  onPress={() => {
                    setSelectedEmployee(emp.id);
                    setIsFilterModalVisible(false);
                  }}
                >
                  <Text className={selectedEmployee === emp.id ? 'font-bold text-brand-primary' : 'font-bold text-gray-700'}>{emp.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Outer shell: role guard before ANY hooks ──────────────────────────────
export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  // Only render the inner component (with all its hooks) for ADMIN users.
  // This satisfies React's Rules of Hooks: hook count never changes between renders.
  if (!user || user.role !== 'ADMIN') return null;
  return <AdminDashboardInner logout={logout} />;
}
