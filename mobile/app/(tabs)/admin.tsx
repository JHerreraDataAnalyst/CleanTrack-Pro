import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Agenda, LocaleConfig } from 'react-native-calendars';

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
  calendarBackground: '#ffffff',
};

export default function AdminDashboardScreen() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planner'>('dashboard');
  const { logout } = useAuth();

  // DASHBOARD STATE
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  // PLANNER STATE
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [items, setItems] = useState<any>({});
  const [loadingPlanner, setLoadingPlanner] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [currentAgendaMonth, setCurrentAgendaMonth] = useState<any>(null);

  // API URLs
  const API_DASHBOARD = 'http://192.168.1.137:3000/api/work-records/dashboard';
  const API_ADMIN = 'http://192.168.1.137:3000/api/admin';

  // FETCH DASHBOARD
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeTab, selectedMonth]);

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
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'dashboard' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setActiveTab('dashboard')}
          >
            <Text className={`font-bold ${activeTab === 'dashboard' ? 'text-brand-primary' : 'text-gray-500'}`}>Dashboard Histórico</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'planner' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setActiveTab('planner')}
          >
            <Text className={`font-bold ${activeTab === 'planner' ? 'text-brand-primary' : 'text-gray-500'}`}>Agenda Global</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* DASHBOARD VIEW */}
      {activeTab === 'dashboard' && (
        <ScrollView className="flex-1 px-4">
          {/* MONTH SELECTOR */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 mt-2">
            {MONTHS.map((m, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedMonth(idx)}
                className={`px-5 py-2 rounded-full mr-2 border shadow-sm ${selectedMonth === idx ? 'bg-brand-primary border-brand-primary' : 'bg-white border-gray-200'}`}
              >
                <Text className={selectedMonth === idx ? 'text-white font-bold' : 'text-gray-600 font-medium'}>{m} 2026</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingDashboard ? (
            <ActivityIndicator size="large" color="#0066FF" style={{ marginTop: 40 }} />
          ) : dashboardData ? (
            <>
              <View className="bg-brand-primary p-6 rounded-2xl shadow-lg mb-8">
                <Text className="text-brand-light font-medium text-base mb-1">Gasto de Nómina ({MONTHS[selectedMonth]})</Text>
                <Text className="text-white text-4xl font-black">€{dashboardData.totalPayroll.toFixed(2)}</Text>
                <View className="flex-row mt-3 items-center">
                  <IconSymbol name="chart.line.uptrend.xyaxis" size={16} color="white" />
                  <Text className="text-white ml-2 opacity-80 text-sm">Registro histórico consolidado</Text>
                </View>
              </View>

              <View className="bg-white p-5 rounded-2xl shadow-sm mb-8 border border-gray-100">
                <Text className="text-lg font-bold text-brand-dark mb-4">Gasto Diario ({MONTHS[selectedMonth]})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row items-end h-40 pt-4 pr-4">
                    {dashboardData.dailySpending && dashboardData.dailySpending.map((day: any, index: number) => {
                      const heightPercentage = (day.monto_total / getMaxDailySpending()) * 100;
                      const dayNumber = day.fecha.split('-')[2];
                      
                      return (
                        <View key={index} className="items-center w-12">
                          <Text className="text-[10px] text-gray-400 mb-1 font-semibold">€{day.monto_total}</Text>
                          <View className="w-6 bg-brand-primary/10 rounded-t-lg overflow-hidden h-24 justify-end">
                            <View 
                              className="w-full bg-brand-primary rounded-t-lg" 
                              style={{ height: `${heightPercentage}%` }} 
                            />
                          </View>
                          <Text className="text-xs text-brand-dark mt-2">{dayNumber}</Text>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <Text className="text-xl font-bold text-brand-dark mb-2">Desempeño Mensual y Costos</Text>
              <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                {dashboardData.trafficLight.length === 0 ? (
                  <View className="p-6 items-center">
                    <Text className="text-gray-500">No hay registros para este mes.</Text>
                  </View>
                ) : (
                  dashboardData.trafficLight.map((worker: any, index: number) => (
                    <View 
                      key={worker.workerId} 
                      className={`flex-row items-center p-4 ${index !== dashboardData.trafficLight.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <View className={`w-3 h-3 rounded-full mr-4 ${getStatusColor(worker.status)}`} />
                      <View className="flex-1">
                        <Text className="text-brand-dark font-semibold text-lg">{worker.workerName}</Text>
                        <Text className={`text-xs mt-0.5 ${
                          worker.status === 'green' ? 'text-green-600' : 
                          worker.status === 'yellow' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          Estado Mes: {getStatusText(worker.status)}
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
          ) : null}
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
                  <Text className={`font-bold ${selectedEmployee === emp.id ? 'text-brand-primary' : 'text-gray-700'}`}>{emp.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
