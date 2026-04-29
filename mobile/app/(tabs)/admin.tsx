import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Calendar, LocaleConfig } from 'react-native-calendars';

// Configuración en español para el calendario
LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene.', 'Feb.', 'Mar', 'Abr', 'May', 'Jun', 'Jul.', 'Ago', 'Sept.', 'Oct.', 'Nov.', 'Dic.'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom.', 'Lun.', 'Mar.', 'Mié.', 'Jue.', 'Vie.', 'Sáb.'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

export default function AdminDashboardScreen() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'planner'>('dashboard');
  const { logout } = useAuth();

  // DASHBOARD STATE
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // PLANNER STATE
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loadingPlanner, setLoadingPlanner] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);

  // API URLs
  const API_DASHBOARD = 'http://192.168.1.137:3000/api/work-records/dashboard';
  const API_ADMIN = 'http://192.168.1.137:3000/api/admin';

  // FETCH DASHBOARD
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setLoadingDashboard(true);
    try {
      const response = await fetch(API_DASHBOARD);
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
      if (data.length > 0 && !selectedEmployee) {
        setSelectedEmployee(data[0].id);
      }
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

  // FETCH ASSIGNMENTS WHEN EMPLOYEE OR DATE CHANGES
  useEffect(() => {
    if (activeTab === 'planner' && selectedEmployee && selectedDate) {
      fetchAssignments();
    }
  }, [selectedEmployee, selectedDate, activeTab]);

  const fetchAssignments = async () => {
    setLoadingPlanner(true);
    try {
      const res = await fetch(`${API_ADMIN}/assignments/${selectedEmployee}/${selectedDate}`);
      const data = await res.json();
      setAssignments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPlanner(false);
    }
  };

  const handleAssign = async (addressId: string) => {
    setIsModalVisible(false);
    setLoadingPlanner(true);
    try {
      const res = await fetch(`${API_ADMIN}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedEmployee,
          addressId,
          date: selectedDate
        })
      });
      if (res.ok) {
        fetchAssignments();
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

  const handleDeleteAssignment = async (id: string) => {
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
                fetchAssignments();
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
  };

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
      case 'green': return 'Completado';
      case 'yellow': return 'Pendiente Confirmar';
      case 'red': return 'Sin Registros';
      default: return 'Desconocido';
    }
  };

  const getMaxDailySpending = () => {
    if (!dashboardData || !dashboardData.dailySpending) return 1;
    const max = Math.max(...dashboardData.dailySpending.map((d: any) => d.monto_total));
    return max > 0 ? max : 1;
  };

  return (
    <View className="flex-1 bg-brand-light">
      <ScrollView className="flex-1 p-4">
        {/* HEADER */}
        <View className="flex-row justify-between items-center mb-6 mt-4">
          <Text className="text-2xl font-bold text-brand-dark">Centro de Operaciones</Text>
          <TouchableOpacity onPress={logout} className="bg-red-100 p-2 rounded-lg">
            <Text className="text-red-600 font-bold">Salir</Text>
          </TouchableOpacity>
        </View>

        {/* TOGGLE */}
        <View className="flex-row bg-gray-200 rounded-xl p-1 mb-6">
          <TouchableOpacity 
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'dashboard' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setActiveTab('dashboard')}
          >
            <Text className={`font-bold ${activeTab === 'dashboard' ? 'text-brand-primary' : 'text-gray-500'}`}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === 'planner' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setActiveTab('planner')}
          >
            <Text className={`font-bold ${activeTab === 'planner' ? 'text-brand-primary' : 'text-gray-500'}`}>Planificador</Text>
          </TouchableOpacity>
        </View>

        {/* DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <View>
            {loadingDashboard ? (
              <ActivityIndicator size="large" color="#0066FF" style={{ marginTop: 40 }} />
            ) : dashboardData ? (
              <>
                <View className="bg-brand-primary p-6 rounded-2xl shadow-lg mb-8">
                  <Text className="text-brand-light font-medium text-base mb-1">Gasto de Nómina (Mes Actual)</Text>
                  <Text className="text-white text-4xl font-black">€{dashboardData.totalPayroll.toFixed(2)}</Text>
                  <View className="flex-row mt-3 items-center">
                    <IconSymbol name="chart.line.uptrend.xyaxis" size={16} color="white" />
                    <Text className="text-white ml-2 opacity-80 text-sm">Visualización financiera en tiempo real</Text>
                  </View>
                </View>

                <View className="bg-white p-5 rounded-2xl shadow-sm mb-8 border border-gray-100">
                  <Text className="text-lg font-bold text-brand-dark mb-4">Gasto de los Últimos 7 Días</Text>
                  <View className="flex-row justify-between items-end h-40 pt-4">
                    {dashboardData.dailySpending && dashboardData.dailySpending.map((day: any, index: number) => {
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

                <Text className="text-xl font-bold text-brand-dark mb-2">Desempeño y Costos</Text>
                <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                  {dashboardData.trafficLight.length === 0 ? (
                    <View className="p-6 items-center">
                      <Text className="text-gray-500">No hay trabajadores hoy.</Text>
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
            ) : null}
          </View>
        )}

        {/* PLANNER VIEW */}
        {activeTab === 'planner' && (
          <View className="pb-20">
            <Text className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">1. Seleccionar Empleado</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
              {employees.map(emp => (
                <TouchableOpacity
                  key={emp.id}
                  onPress={() => setSelectedEmployee(emp.id)}
                  className={`px-5 py-3 rounded-full mr-3 border shadow-sm ${selectedEmployee === emp.id ? 'bg-brand-primary border-brand-primary' : 'bg-white border-gray-200'}`}
                >
                  <Text className={selectedEmployee === emp.id ? 'text-white font-bold' : 'text-brand-dark font-medium'}>{emp.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">2. Seleccionar Fecha</Text>
            <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <Calendar
                current={selectedDate}
                onDayPress={(day: any) => setSelectedDate(day.dateString)}
                markedDates={{
                  [selectedDate]: { selected: true, selectedColor: '#0066FF' }
                }}
                theme={{
                  todayTextColor: '#0066FF',
                  arrowColor: '#0066FF',
                  textDayFontWeight: '500',
                  textMonthFontWeight: 'bold',
                }}
              />
            </View>

            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-sm font-bold uppercase tracking-wider text-gray-500">3. Asignaciones del Día</Text>
            </View>

            {loadingPlanner ? (
              <ActivityIndicator size="large" color="#0066FF" style={{ marginTop: 20 }} />
            ) : assignments.length === 0 ? (
              <View className="bg-white p-6 rounded-2xl items-center border border-gray-200 border-dashed mb-6 shadow-sm">
                <Text className="text-gray-500 font-medium">No hay asignaciones planificadas.</Text>
                <Text className="text-gray-400 text-xs mt-1 text-center">Pulsa el botón "+" para añadir una nueva sede a la ruta de hoy.</Text>
              </View>
            ) : (
              assignments.map(item => (
                <View key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-3 flex-row justify-between items-center">
                  <View className="flex-1 pr-4">
                    <Text className="font-bold text-brand-dark text-lg mb-1">{item.address.street}</Text>
                    <View className="flex-row items-center">
                      <IconSymbol name="map.fill" size={12} color="#6B7280" />
                      <Text className="text-gray-500 text-sm ml-1">{item.address.city}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    onPress={() => handleDeleteAssignment(item.id)}
                    className="bg-red-50 p-3 rounded-xl border border-red-100"
                  >
                    <IconSymbol name="xmark" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
            
            {/* Espacio adicional al final para que no tape el FAB */}
            <View className="h-10" />
          </View>
        )}
      </ScrollView>

      {/* FLOATING ACTION BUTTON (FAB) FOR PLANNER */}
      {activeTab === 'planner' && selectedEmployee && (
        <TouchableOpacity 
          className="absolute bottom-6 right-6 w-16 h-16 bg-brand-primary rounded-full items-center justify-center shadow-lg border-2 border-white"
          style={{ elevation: 5 }}
          onPress={() => setIsModalVisible(true)}
        >
          <IconSymbol name="plus" size={30} color="white" />
        </TouchableOpacity>
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
    </View>
  );
}
