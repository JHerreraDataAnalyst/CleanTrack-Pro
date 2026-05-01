import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths, isBefore, startOfDay } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://192.168.1.137:3000/api/calendar';

export interface CalendarAssignment {
  id: string;
  date: string;
  addressId: string;
  address: {
    street: string;
    city: string;
    instructions: string | null;
  };
  worker: {
    id: string;
    name: string;
  };
  totalHours: number;
  workRecords: Array<{
    id: string;
    roomId: string;
    hours: number;
    isVerified: boolean;
  }>;
}

export interface DailyData {
  date: string;
  totalHours: number;
  assignments: CalendarAssignment[];
}

export const useCalendar = () => {
  const { user, token } = useAuth();
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // Definir rango de búsqueda dinámico basado en un rango amplio (ej: -6 a +6 meses)
  // para permitir navegar al pasado fluidamente sin cargar toda la base de datos de golpe.
  // Podrías atar esto al mes visible en el calendario si necesitas más optimización.
  const startDate = format(startOfMonth(addMonths(new Date(), -6)), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(addMonths(new Date(), 6)), 'yyyy-MM-dd');

  const { data, isLoading, error, refetch } = useQuery<DailyData[]>({
    queryKey: ['calendarAssignments', startDate, endDate, user?.id],
    queryFn: async () => {
      let url = `${API_BASE_URL}/assignments?startDate=${startDate}&endDate=${endDate}`;
      if (user?.role === 'TRABAJADOR') {
        url += `&workerId=${user.id}`;
      }
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Error al cargar calendario');
      return response.json();
    },
    enabled: !!token && !!user,
  });

  // Generar markedDates para react-native-calendars
  const markedDates = useMemo(() => {
    if (!data) return {};

    const marked: any = {};
    
    data.forEach((day) => {
      marked[day.date] = {
        marked: day.totalHours > 0,
        dotColor: '#10B981',
        customStyles: {
          container: {
            backgroundColor: day.date === selectedDate ? '#1E3A8A' : 'transparent',
            borderRadius: 8,
          },
          text: {
            color: day.date === selectedDate ? '#ffffff' : '#1F2937',
            fontWeight: day.date === selectedDate ? 'bold' : 'normal',
          },
        },
      };
    });

    // Marcar el día seleccionado si no tiene datos
    if (!marked[selectedDate]) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: '#1E3A8A',
      };
    }

    return marked;
  }, [data, selectedDate]);

  // Formatear items para el componente Agenda
  const agendaItems = useMemo(() => {
    if (!data) return {};
    const items: any = {};
    const today = startOfMonth(new Date()); // O startOfDay, pero para pendientes pasados
    
    data.forEach((day) => {
      let dayAssignments = day.assignments;
      
      if (showPendingOnly && user?.role === 'ADMIN') {
        const dateObj = new Date(day.date);
        const isPast = isBefore(dateObj, startOfDay(new Date()));
        if (isPast) {
           dayAssignments = dayAssignments.filter(a => a.totalHours === 0);
        } else {
           dayAssignments = []; // No mostramos futuras/hoy en pendientes
        }
      }
      
      if (dayAssignments.length > 0 || !showPendingOnly) {
        items[day.date] = dayAssignments;
      }
    });
    return items;
  }, [data, showPendingOnly, user]);

  // Ya no hay restricciones de minDate para ningún rol (Trabajador puede ver historial)


  return {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    showPendingOnly,
    setShowPendingOnly,
    data,
    isLoading,
    error,
    markedDates,
    agendaItems,
    userRole: user?.role,
    refetch,
  };
};
