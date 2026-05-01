import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths, isBefore } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://192.168.1.137:3000/api/calendar';

export interface CalendarAssignment {
  id: string;
  date: string;
  address: {
    street: string;
    city: string;
  };
  worker: {
    id: string;
    name: string;
  };
  totalHours: number;
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

  // Definir rango de búsqueda inicial
  const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(addMonths(new Date(), 3)), 'yyyy-MM-dd');

  const { data, isLoading, error, refetch } = useQuery<DailyData[]>({
    queryKey: ['calendarAssignments', startDate, endDate, user?.id],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/assignments?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
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
    data.forEach((day) => {
      items[day.date] = day.assignments;
    });
    return items;
  }, [data]);

  // Restricciones de rol
  const minDate = useMemo(() => {
    if (user?.role === 'TRABAJADOR') {
      return format(startOfMonth(new Date()), 'yyyy-MM-dd');
    }
    return undefined; // Admin puede ver todo el pasado
  }, [user]);

  const isPastDateRestricted = (dateString: string) => {
    if (user?.role !== 'TRABAJADOR') return false;
    const date = new Date(dateString);
    const startOfCurrent = startOfMonth(new Date());
    return isBefore(date, startOfCurrent);
  };

  return {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    data,
    isLoading,
    error,
    markedDates,
    agendaItems,
    minDate,
    isPastDateRestricted,
    userRole: user?.role,
    refetch,
  };
};
