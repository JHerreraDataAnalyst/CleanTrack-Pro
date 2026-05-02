import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, ScrollView, TextInput, Alert, Switch, Image } from 'react-native';
import { Calendar, Agenda, CalendarList } from 'react-native-calendars';
import { useCalendar, CalendarAssignment } from '../../hooks/useCalendar';
import { CALENDAR_THEME } from '../../constants/calendarTheme';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { isBefore, startOfDay, parseISO } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const API_BASE = 'http://192.168.1.137:3000/api';
const BACKEND_URL = 'http://192.168.1.137:3000';

export default function CalendarScreen() {
  const {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    isLoading,
    markedDates,
    agendaItems,
    userRole,
    showPendingOnly,
    setShowPendingOnly,
    refetch,
  } = useCalendar();

  const queryClient = useQueryClient();
  const router = useRouter();
  const { token } = useAuth(); // Needed for the API call

  // Estado para el modal de detalle
  const [selectedAssignment, setSelectedAssignment] = useState<CalendarAssignment | null>(null);

  // Estado para el modal de registro de trabajo
  const [logHoursAssignment, setLogHoursAssignment] = useState<CalendarAssignment | null>(null);
  const [roomLogs, setRoomLogs] = useState([{ roomId: '', hours: '' }]);
  const [siteRooms, setSiteRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado para el modal de incidencias
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [issueAssignment, setIssueAssignment] = useState<CalendarAssignment | null>(null);
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePhoto, setIssuePhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  
  const [isClosingJornada, setIsClosingJornada] = useState(false);

  // ── Add Assignment Modal (Admin) ──────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addWorkers, setAddWorkers] = useState<Array<{id: string; name: string; email: string}>>([]);
  const [addAddresses, setAddAddresses] = useState<Array<{id: string; street: string; city: string}>>([]);
  const [addWorkerId, setAddWorkerId] = useState('');
  const [addAddressId, setAddAddressId] = useState('');
  const [addDate, setAddDate] = useState('');
  const [addShowCalendar, setAddShowCalendar] = useState(false);
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Cargar las habitaciones predefinidas del sitio cuando se abre el modal
  useEffect(() => {
    if (logHoursAssignment) {
      const fetchRooms = async () => {
        setIsLoadingRooms(true);
        try {
          const addressId = logHoursAssignment.addressId;
          const res = await fetch(`${API_BASE}/admin/addresses/${addressId}/rooms`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          setSiteRooms(data);
          // Inicializar roomLogs con el primer cuarto seleccionado si hay habitaciones
          if (data.length > 0) {
            setRoomLogs([{ roomId: data[0].id, hours: '' }]);
          }
        } catch {
          Alert.alert('Error', 'No se pudieron cargar las habitaciones del sitio.');
          setLogHoursAssignment(null);
        } finally {
          setIsLoadingRooms(false);
        }
      };
      fetchRooms();
    } else {
      setSiteRooms([]);
      setRoomLogs([{ roomId: '', hours: '' }]);
    }
  }, [logHoursAssignment]);

  const handleAddAssignment = async () => {
    setAddWorkerId('');
    setAddAddressId('');
    setAddDate(selectedDate);
    setAddShowCalendar(false);
    setShowAddModal(true);
    setIsLoadingFormData(true);
    try {
      const [wRes, aRes] = await Promise.all([
        fetch(`${API_BASE}/admin/employees`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/admin/addresses`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const workers = await wRes.json();
      const addresses = await aRes.json();
      setAddWorkers(workers);
      setAddAddresses(addresses);
    } catch {
      Alert.alert('Error', 'No se pudo cargar la lista de trabajadores o sedes.');
      setShowAddModal(false);
    } finally {
      setIsLoadingFormData(false);
    }
  };

  const handleLogHoursSubmit = async () => {
    if (!logHoursAssignment || !token) return;
    
    for (const log of roomLogs) {
      if (!log.roomId || !log.hours.trim() || isNaN(Number(log.hours))) {
        Alert.alert('Error', 'Por favor selecciona una habitación e ingresa las horas para cada registro.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      for (const log of roomLogs) {
        const response = await fetch(`${API_BASE}/work-records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            assignmentId: logHoursAssignment.id,
            roomId: log.roomId,
            hours: Number(log.hours),
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Error al guardar registro');
        }
      }

      Alert.alert('Éxito', 'Horas registradas correctamente.');
      setLogHoursAssignment(null);
      refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Hubo un problema al registrar las horas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Incidencias ---
  const pickImage = async () => {
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara para reportar incidencias.');
      return;
    }

    Alert.alert('Adjuntar Foto', 'Elige una opción', [
      {
        text: 'Cámara',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            allowsEditing: true,
          });
          if (!result.canceled && result.assets[0]) {
            setIssuePhoto(result.assets[0]);
          }
        },
      },
      {
        text: 'Galería',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            allowsEditing: true,
          });
          if (!result.canceled && result.assets[0]) {
            setIssuePhoto(result.assets[0]);
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const handleIssueSubmit = async () => {
    if (!issueAssignment || !issueDescription.trim()) {
      Alert.alert('Error', 'Por favor escribe una descripción de la incidencia.');
      return;
    }

    // Necesitamos un workRecordId. Si la asignación ya tiene registros, usamos el primero.
    // Si no, avisamos que primero registre horas.
    const firstRecord = issueAssignment.workRecords?.[0];
    if (!firstRecord) {
      Alert.alert('Atención', 'Primero debes registrar horas de trabajo antes de reportar una incidencia.');
      return;
    }

    setIsSubmittingIssue(true);
    try {
      const formData = new FormData();
      formData.append('workRecordId', firstRecord.id);
      formData.append('description', issueDescription);

      if (issuePhoto) {
        const filename = issuePhoto.uri.split('/').pop() || 'photo.jpg';
        const match = /\.([\w]+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('photo', {
          uri: issuePhoto.uri,
          name: filename,
          type,
        } as any);
      }

      const response = await fetch(`${API_BASE}/worker/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Error al reportar incidencia');
      }

      Alert.alert('Éxito', 'Incidencia reportada correctamente. El administrador será notificado.');
      setIssueModalVisible(false);
      setIssueDescription('');
      setIssuePhoto(null);
      setIssueAssignment(null);
      refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo enviar la incidencia.');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // --- Cierre de Jornada ---
  const handleCloseJornada = async (assignment: CalendarAssignment) => {
    setIsClosingJornada(true);
    try {
      // 1. Validar si faltan habitaciones
      const valResponse = await fetch(`${API_BASE}/worker/assignments/${assignment.id}/validate-closure`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const valData = await valResponse.json();

      if (!valResponse.ok) {
        throw new Error(valData.error || 'Error al validar el cierre');
      }

      if (!valData.canClose && valData.missingRooms && valData.missingRooms.length > 0) {
        const roomNames = valData.missingRooms.map((r: any) => r.name).join(', ');
        Alert.alert(
          'Registro Incompleto',
          `Falta reportar horas en las siguientes áreas:\n\n${roomNames}\n\nPor favor, registra el trabajo antes de finalizar la jornada.`
        );
        setIsClosingJornada(false);
        return;
      }

      // 2. Confirmar cierre
      Alert.alert(
        'Confirmar Cierre',
        '¿Estás seguro de finalizar la jornada? Una vez cerrada, no podrás añadir más horas ni incidencias.',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => setIsClosingJornada(false) },
          {
            text: 'Finalizar',
            style: 'destructive',
            onPress: async () => {
              try {
                const closeResponse = await fetch(`${API_BASE}/worker/assignments/${assignment.id}/close`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                });
                const closeData = await closeResponse.json();

                if (!closeResponse.ok) {
                  throw new Error(closeData.error || 'Error al cerrar jornada');
                }

                Alert.alert('Jornada Finalizada', 'Buen trabajo. El servicio ha sido marcado como completado.');
                setSelectedAssignment(null);
                refetch();
              } catch (error: any) {
                Alert.alert('Error', error.message);
              } finally {
                setIsClosingJornada(false);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Error de conexión');
      setIsClosingJornada(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!addWorkerId || !addAddressId || !addDate) {
      Alert.alert('Campos incompletos', 'Selecciona un trabajador, una sede y una fecha.');
      return;
    }
    setIsCreating(true);
    try {
      const response = await fetch(`${API_BASE}/admin/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workerId: addWorkerId, addressId: addAddressId, date: addDate }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al crear asignación');
      Alert.alert('✅ Asignación Creada', `Servicio programado para el ${addDate}.`);
      setShowAddModal(false);
      queryClient.invalidateQueries({ queryKey: ['calendarAssignments'] });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#1E3A8A" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Segmented Control */}
      <View className="flex-row p-4 border-b border-gray-100 bg-white">
        <View className="flex-row flex-1 bg-gray-100 rounded-xl p-1">
          {(['day', 'week', 'month'] as const).map((mode) => (
            <TouchableOpacity
              key={mode}
              onPress={() => setViewMode(mode)}
              className={viewMode === mode
                ? 'flex-1 py-2 items-center rounded-lg bg-white shadow-sm'
                : 'flex-1 py-2 items-center rounded-lg'}
            >
              <Text
                className={viewMode === mode
                  ? 'font-bold capitalize text-brand-primary'
                  : 'font-bold capitalize text-gray-500'}
              >
                {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Admin Filter */}
      {userRole === 'ADMIN' && viewMode === 'day' && (
        <View className="flex-row justify-between items-center px-4 py-2 bg-red-50 border-b border-red-100">
          <Text className="text-red-800 font-bold">Ver Pendientes de Reporte</Text>
          <Switch 
            value={showPendingOnly}
            onValueChange={setShowPendingOnly}
            trackColor={{ false: '#D1D5DB', true: '#FCA5A5' }}
            thumbColor={showPendingOnly ? '#EF4444' : '#f4f3f4'}
          />
        </View>
      )}



      {/* Calendar Views */}
      <View className="flex-1 overflow-hidden">
        {viewMode === 'month' && (
          <View className="flex-1">
            <Calendar
              current={selectedDate}
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={markedDates}
              theme={CALENDAR_THEME}
              enableSwipeMonths={true}
              markingType={'custom'}
            />
            {/* Task list for selected date — no overlap, fills remaining space */}
            <View className="flex-1 bg-gray-50">
              <View className="px-4 py-2 bg-white border-b border-gray-100 flex-row justify-between items-center">
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Servicios — {selectedDate}
                </Text>
                <Text className="text-brand-primary text-xs font-bold">
                  {(agendaItems[selectedDate] || []).length} tarea(s)
                </Text>
              </View>
              <ScrollView className="flex-1" contentContainerStyle={{ padding: 12, paddingBottom: 100 }}>
                {(agendaItems[selectedDate] || []).length === 0 ? (
                  <View className="py-10 items-center opacity-40">
                    <IconSymbol name="calendar.badge.exclamationmark" size={40} color="#9CA3AF" />
                    <Text className="text-gray-500 mt-2 font-medium">Sin tareas para este día</Text>
                  </View>
                ) : (
                  (agendaItems[selectedDate] || []).map((item: any) => {
                    const isPast = isBefore(parseISO(item.date), startOfDay(new Date()));
                    const isPending = isPast && item.totalHours === 0;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        className={`bg-white p-4 rounded-xl shadow-sm border mb-3 ${isPending && userRole === 'ADMIN' ? 'border-red-300 bg-red-50' : 'border-gray-100'}`}
                        onPress={() => setSelectedAssignment(item)}
                      >
                        <View className="flex-row justify-between items-center mb-1">
                          <View className="flex-row items-center flex-1">
                            {item.status === 'COMPLETED' && (
                              <IconSymbol name="checkmark.circle.fill" size={16} color="#10B981" />
                            )}
                            {isPending && userRole === 'ADMIN' && (
                              <IconSymbol name="exclamationmark.triangle.fill" size={16} color="#EF4444" />
                            )}
                            <Text className="text-brand-primary font-bold text-base flex-1 ml-1" numberOfLines={1}>
                              {item.address.street}
                            </Text>
                          </View>
                          <View className={`${item.totalHours > 0 ? 'bg-green-100' : 'bg-gray-100'} px-2 py-1 rounded-md ml-2`}>
                            <Text className={`${item.totalHours > 0 ? 'text-green-700' : 'text-gray-600'} font-bold text-xs`}>
                              {item.totalHours}h
                            </Text>
                          </View>
                        </View>
                        <Text className="text-gray-500 text-sm">{item.address.city} • {item.worker.name}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {viewMode === 'week' && (
          <CalendarList
            horizontal={true}
            pagingEnabled={true}
            calendarWidth={375}
            markedDates={markedDates}
            theme={CALENDAR_THEME}
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setViewMode('day');
            }}
          />
        )}

        {viewMode === 'day' && (
          <Agenda
            items={agendaItems}
            selected={selectedDate}
            renderItem={(item: any) => {
              const isPast = isBefore(parseISO(item.date), startOfDay(new Date()));
              const isPending = isPast && item.totalHours === 0;
              return (
                <View className={`bg-white p-4 mr-4 mt-4 rounded-xl shadow-sm border ${isPending && userRole === 'ADMIN' ? 'border-red-400 bg-red-50' : 'border-gray-100'}`}>
                  <View className="flex-row justify-between items-center mb-2">
                    <View className="flex-row items-center flex-1">
                      {isPending && userRole === 'ADMIN' && (
                        <View className="mr-2">
                          <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#EF4444" />
                        </View>
                      )}
                      {item.status === 'COMPLETED' && (
                        <View className="mr-2">
                          <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
                        </View>
                      )}
                      <Text className="text-brand-primary font-bold text-lg flex-1" numberOfLines={1}>
                        {item.address.street}
                      </Text>
                    </View>
                    <View className={`${item.totalHours > 0 ? 'bg-green-100' : 'bg-gray-100'} px-2 py-1 rounded-md`}>
                      <Text className={`${item.totalHours > 0 ? 'text-green-700' : 'text-gray-600'} font-bold text-xs`}>
                        {item.totalHours}h
                      </Text>
                    </View>
                  </View>
                  <Text className="text-gray-600 mb-4">
                    {item.address.city} • {item.worker.name}
                  </Text>
                  <TouchableOpacity
                    className="bg-brand-primary py-2 rounded-lg items-center"
                    onPress={() => setSelectedAssignment(item)}
                  >
                    <Text className="text-white font-bold">Ver Detalles</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
            renderEmptyDate={() => (
              <View className="flex-1 justify-center items-center p-10 opacity-40">
                <IconSymbol name="calendar.badge.exclamationmark" size={48} color="#9CA3AF" />
                <Text className="text-gray-500 mt-2 font-medium">Sin tareas para este día</Text>
              </View>
            )}
            theme={CALENDAR_THEME}
            rowHasChanged={(r1: any, r2: any) => r1.id !== r2.id}
          />
        )}
      </View>

      {/* FAB: Añadir Asignación (Admin only) */}
      {userRole === 'ADMIN' && (
        <TouchableOpacity
          className="absolute bottom-6 right-6 bg-brand-primary rounded-2xl px-5 h-14 flex-row items-center justify-center shadow-lg shadow-black/30"
          activeOpacity={0.8}
          onPress={handleAddAssignment}
        >
          <IconSymbol name="plus" size={22} color="white" />
          <Text className="text-white font-bold text-base ml-2">Áñadir Asignación</Text>
        </TouchableOpacity>
      )}

      {/* ══ MODAL: Añadir Asignación ══ */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl shadow-xl" style={{ maxHeight: '92%' }}>
            {/* Header */}
            <View className="flex-row justify-between items-center px-6 pt-6 pb-4 border-b border-gray-100">
              <Text className="text-2xl font-bold text-gray-900">Nueva Asignación</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} className="p-2 bg-gray-100 rounded-full">
                <IconSymbol name="xmark" size={20} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {isLoadingFormData ? (
              <View className="py-20 items-center">
                <ActivityIndicator size="large" color="#0066FF" />
                <Text className="text-gray-400 mt-4">Cargando datos...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                {/* 1. Worker selector */}
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Trabajador</Text>
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {addWorkers.map(w => (
                    <TouchableOpacity
                      key={w.id}
                      onPress={() => setAddWorkerId(w.id)}
                      className={`px-4 py-2 rounded-full border ${
                        addWorkerId === w.id ? 'bg-brand-primary border-brand-primary' : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`font-semibold text-sm ${addWorkerId === w.id ? 'text-white' : 'text-gray-700'}`}>
                        {w.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 2. Address selector */}
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Sede</Text>
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {addAddresses.map(a => (
                    <TouchableOpacity
                      key={a.id}
                      onPress={() => setAddAddressId(a.id)}
                      className={`px-4 py-2 rounded-full border ${
                        addAddressId === a.id ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`font-semibold text-sm ${addAddressId === a.id ? 'text-white' : 'text-gray-700'}`}>
                        {a.street}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* 3. Date picker using Calendar */}
                <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Fecha</Text>
                <TouchableOpacity
                  onPress={() => setAddShowCalendar(!addShowCalendar)}
                  className="flex-row items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4 mb-2"
                >
                  <View className="flex-row items-center">
                    <IconSymbol name="calendar" size={20} color="#6B7280" />
                    <Text className={`ml-3 font-semibold text-base ${addDate ? 'text-gray-900' : 'text-gray-400'}`}>
                      {addDate || 'Selecciona una fecha'}
                    </Text>
                  </View>
                  <IconSymbol name={addShowCalendar ? 'chevron.up' : 'chevron.down'} size={16} color="#9CA3AF" />
                </TouchableOpacity>
                {addShowCalendar && (
                  <View className="rounded-2xl overflow-hidden border border-gray-200 mb-6">
                    <Calendar
                      current={addDate || selectedDate}
                      onDayPress={(day) => {
                        setAddDate(day.dateString);
                        setAddShowCalendar(false);
                      }}
                      markedDates={addDate ? { [addDate]: { selected: true, selectedColor: '#0066FF' } } : {}}
                      theme={CALENDAR_THEME}
                    />
                  </View>
                )}

                {/* Summary */}
                {addWorkerId && addAddressId && addDate && (
                  <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
                    <Text className="text-blue-800 font-bold text-sm mb-1">Resumen de la asignación</Text>
                    <Text className="text-blue-700 text-sm">
                      👤 {addWorkers.find(w => w.id === addWorkerId)?.name}{`\n`}
                      📍 {addAddresses.find(a => a.id === addAddressId)?.street}{`\n`}
                      📅 {addDate}
                    </Text>
                  </View>
                )}

                {/* Submit */}
                <TouchableOpacity
                  onPress={handleCreateAssignment}
                  disabled={isCreating || !addWorkerId || !addAddressId || !addDate}
                  className={`py-4 rounded-2xl items-center shadow-sm ${
                    isCreating || !addWorkerId || !addAddressId || !addDate
                      ? 'bg-gray-200'
                      : 'bg-brand-primary'
                  }`}
                >
                  {isCreating ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className={`font-bold text-lg ${
                      !addWorkerId || !addAddressId || !addDate ? 'text-gray-400' : 'text-white'
                    }`}>Guardar Asignación</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Detalle de Asignación */}
      <Modal
        visible={!!selectedAssignment}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedAssignment(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 min-h-[50%] shadow-xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-800">Detalles del Servicio</Text>
              <TouchableOpacity onPress={() => setSelectedAssignment(null)} className="p-2 bg-gray-100 rounded-full">
                <IconSymbol name="xmark" size={20} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {selectedAssignment && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Dirección */}
                <View className="mb-6">
                  <Text className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Dirección</Text>
                  <Text className="text-lg text-gray-800 font-medium">{selectedAssignment.address.street}</Text>
                  <Text className="text-base text-gray-600">{selectedAssignment.address.city}</Text>
                </View>

                {/* Notas / Instrucciones */}
                <View className="mb-6">
                  <Text className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Notas del Servicio</Text>
                  <View className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <Text className="text-blue-800 text-base">
                      {selectedAssignment.address.instructions || "No hay notas adicionales para este servicio."}
                    </Text>
                  </View>
                </View>

                {/* Horario Registrado */}
                <View className="mb-6">
                  <Text className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider">Horario Registrado</Text>
                  <View className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    {selectedAssignment.workRecords && selectedAssignment.workRecords.length > 0 ? (
                      selectedAssignment.workRecords.map((record: any, index: number) => (
                        <View key={record.id} className={`${index > 0 ? 'mt-2 pt-2 border-t border-gray-200' : ''}`}>
                          <View className="flex-row justify-between items-center">
                            <View className="flex-row items-center flex-1">
                              <Text className="text-gray-700 font-medium">{record.room?.name || 'Habitación'}</Text>
                              {record.issues && record.issues.length > 0 && (
                                <View className="ml-2 bg-amber-100 px-2 py-0.5 rounded-full flex-row items-center">
                                  <IconSymbol name="exclamationmark.triangle.fill" size={12} color="#F59E0B" />
                                  <Text className="text-amber-700 text-xs ml-1 font-bold">{record.issues.length}</Text>
                                </View>
                              )}
                            </View>
                            <Text className="text-brand-primary font-bold">{record.hours} h</Text>
                          </View>
                          {/* Mostrar incidencias al Admin */}
                          {userRole === 'ADMIN' && record.issues && record.issues.length > 0 && (
                            <View className="mt-2">
                              {record.issues.map((issue: any) => (
                                <View key={issue.id} className="bg-red-50 p-3 rounded-lg border border-red-100 mt-1">
                                  <Text className="text-red-800 font-semibold text-sm">{issue.description}</Text>
                                  {issue.photoUrl && (
                                    <Image
                                      source={{ uri: `${BACKEND_URL}${issue.photoUrl}` }}
                                      className="w-full h-40 rounded-lg mt-2"
                                      resizeMode="cover"
                                    />
                                  )}
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ))
                    ) : (
                      <Text className="text-gray-500 italic">No hay horas registradas aún.</Text>
                    )}
                    <View className="mt-3 pt-3 border-t border-gray-300 flex-row justify-between items-center">
                      <Text className="font-bold text-gray-800">Total</Text>
                      <Text className="font-bold text-brand-primary text-lg">{selectedAssignment.totalHours} horas</Text>
                    </View>
                  </View>
                </View>

                {/* Acciones */}
                <View className="mt-4 mb-8">
                  {userRole === 'ADMIN' ? (
                    <TouchableOpacity 
                      className="bg-brand-primary py-4 rounded-xl items-center shadow-sm"
                      onPress={() => {
                        console.log('Navegando a editar horas de la asignación:', selectedAssignment.id);
                        setSelectedAssignment(null);
                      }}
                    >
                      <Text className="text-white font-bold text-lg">Editar Asignación</Text>
                    </TouchableOpacity>
                  ) : (
                    <View>
                      {selectedAssignment.status === 'COMPLETED' ? (
                        <View className="bg-green-50 p-4 rounded-xl border border-green-200 items-center mb-4">
                          <IconSymbol name="checkmark.seal.fill" size={32} color="#10B981" />
                          <Text className="text-green-800 font-bold text-lg mt-2">Servicio Completado</Text>
                          <Text className="text-green-700 text-center mt-1">Has finalizado tu jornada para esta dirección. Los registros son de solo lectura.</Text>
                        </View>
                      ) : (
                        <View>
                          <TouchableOpacity 
                            className="bg-brand-primary py-4 rounded-xl items-center shadow-sm mb-3"
                            onPress={() => {
                              setLogHoursAssignment(selectedAssignment);
                              setSelectedAssignment(null);
                            }}
                          >
                            <Text className="text-white font-bold text-lg">Registrar Trabajo</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            className="bg-amber-500 py-3 rounded-xl items-center shadow-sm flex-row justify-center mb-6"
                            onPress={() => {
                              setIssueAssignment(selectedAssignment);
                              setSelectedAssignment(null);
                              setIssueModalVisible(true);
                            }}
                          >
                            <IconSymbol name="camera.fill" size={18} color="white" />
                            <Text className="text-white font-bold text-base ml-2">Reportar Incidencia</Text>
                          </TouchableOpacity>

                          <View className="h-px bg-gray-200 w-full mb-6" />

                          <TouchableOpacity 
                            className={`py-4 rounded-xl items-center shadow-sm flex-row justify-center ${isClosingJornada ? 'bg-green-400' : 'bg-green-600'}`}
                            onPress={() => handleCloseJornada(selectedAssignment)}
                            disabled={isClosingJornada}
                          >
                            {isClosingJornada ? (
                              <ActivityIndicator color="white" />
                            ) : (
                              <>
                                <IconSymbol name="checkmark.circle" size={20} color="white" />
                                <Text className="text-white font-bold text-lg ml-2">Finalizar Jornada</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      {/* Modal de Registro de Horas (Multi-Habitación) */}
      <Modal
        visible={!!logHoursAssignment}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLogHoursAssignment(null)}
      >
        <View className="flex-1 justify-center bg-black/50 p-4">
          <View className="bg-white rounded-3xl p-6 shadow-xl max-h-[90%]">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-800">Registrar Horas</Text>
              <TouchableOpacity onPress={() => setLogHoursAssignment(null)} className="p-2 bg-gray-100 rounded-full">
                <IconSymbol name="xmark" size={20} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {isLoadingRooms ? (
                <View className="py-10 items-center">
                  <ActivityIndicator size="large" color="#1E3A8A" />
                  <Text className="text-gray-500 mt-3">Cargando habitaciones del sitio...</Text>
                </View>
              ) : siteRooms.length === 0 ? (
                <View className="py-10 items-center">
                  <IconSymbol name="exclamationmark.triangle.fill" size={40} color="#F59E0B" />
                  <Text className="text-gray-700 font-bold mt-3 text-center">Este sitio no tiene habitaciones predefinidas.</Text>
                  <Text className="text-gray-500 text-sm mt-1 text-center">Un administrador debe configurarlas primero.</Text>
                </View>
              ) : (
                <>
                  <Text className="text-gray-600 mb-4">
                    Selecciona la habitación en la que trabajaste e ingresa las horas. Puedes añadir varias.
                  </Text>

                  {roomLogs.map((log, index) => (
                    <View key={index} className="mb-5 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                      <View className="flex-row justify-between items-center mb-3">
                        <Text className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                          Habitación {index + 1}
                        </Text>
                        {roomLogs.length > 1 && (
                          <TouchableOpacity onPress={() => setRoomLogs(roomLogs.filter((_, i) => i !== index))}>
                            <IconSymbol name="trash" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                      {/* Room Selector: Chips */}
                      <View className="flex-row flex-wrap gap-2 mb-3">
                        {siteRooms.map((room) => {
                          const isSelected = log.roomId === room.id;
                          return (
                            <TouchableOpacity
                              key={room.id}
                              onPress={() => {
                                const newLogs = [...roomLogs];
                                newLogs[index].roomId = room.id;
                                setRoomLogs(newLogs);
                              }}
                              className={`px-4 py-2 rounded-full border ${
                                isSelected
                                  ? 'bg-brand-primary border-brand-primary'
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              <Text className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                                {room.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      {/* Hours Input */}
                      <Text className="text-xs text-gray-500 mb-1 font-bold ml-1">HORAS TRABAJADAS</Text>
                      <TextInput
                        className="bg-white p-3 rounded-xl text-gray-800 border border-gray-200 text-center text-lg font-bold"
                        placeholder="Ej. 2.5"
                        keyboardType="numeric"
                        value={log.hours}
                        onChangeText={(val) => {
                          const newLogs = [...roomLogs];
                          newLogs[index].hours = val;
                          setRoomLogs(newLogs);
                        }}
                      />
                    </View>
                  ))}

                  <TouchableOpacity
                    className="py-3 border-2 border-dashed border-gray-300 rounded-xl items-center mb-6"
                    onPress={() => setRoomLogs([...roomLogs, { roomId: siteRooms[0]?.id ?? '', hours: '' }])}
                  >
                    <Text className="text-gray-500 font-bold">+ Añadir otra habitación</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`py-4 rounded-xl items-center shadow-sm ${isSubmitting ? 'bg-blue-300' : 'bg-brand-primary'}`}
                    onPress={handleLogHoursSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold text-lg">Guardar Registro</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Modal de Reporte de Incidencia */}
      <Modal
        visible={issueModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIssueModalVisible(false);
          setIssueDescription('');
          setIssuePhoto(null);
        }}
      >
        <View className="flex-1 justify-center bg-black/50 p-4">
          <View className="bg-white rounded-3xl p-6 shadow-xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-gray-800">Reportar Incidencia</Text>
              <TouchableOpacity onPress={() => { setIssueModalVisible(false); setIssueDescription(''); setIssuePhoto(null); }} className="p-2 bg-gray-100 rounded-full">
                <IconSymbol name="xmark" size={20} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-gray-600 mb-4">
                Describe el problema encontrado y adjunta una foto como evidencia.
              </Text>

              <Text className="text-xs text-gray-500 mb-1 font-bold ml-1 uppercase">Descripción</Text>
              <TextInput
                className="bg-gray-100 p-4 rounded-xl text-gray-800 border border-gray-200 mb-4"
                placeholder="Ej. Vidrio roto en ventana, material faltante..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={issueDescription}
                onChangeText={setIssueDescription}
              />

              <Text className="text-xs text-gray-500 mb-2 font-bold ml-1 uppercase">Foto (Opcional)</Text>
              {issuePhoto ? (
                <View className="mb-4">
                  <Image
                    source={{ uri: issuePhoto.uri }}
                    className="w-full h-48 rounded-xl"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => setIssuePhoto(null)}
                    className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-full"
                  >
                    <IconSymbol name="xmark" size={14} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className="border-2 border-dashed border-gray-300 py-8 rounded-xl items-center mb-4"
                  onPress={pickImage}
                >
                  <IconSymbol name="camera.fill" size={32} color="#9CA3AF" />
                  <Text className="text-gray-500 font-medium mt-2">Tomar foto o elegir de galería</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                className={`py-4 rounded-xl items-center shadow-sm ${isSubmittingIssue ? 'bg-amber-300' : 'bg-amber-500'}`}
                onPress={handleIssueSubmit}
                disabled={isSubmittingIssue}
              >
                {isSubmittingIssue ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-lg">Enviar Incidencia</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
