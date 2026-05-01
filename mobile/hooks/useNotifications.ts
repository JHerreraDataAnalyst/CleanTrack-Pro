import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = 'http://192.168.1.137:3000/api/notifications';

export interface Notification {
  id: string;
  title: string;
  message: string;
  userId: string;
  isRead: boolean;
  createdAt: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, error, refetch } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}?userId=${user?.id}`);
      if (!response.ok) throw new Error('Error al cargar notificaciones');
      return response.json();
    },
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/${id}/read`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('Error al marcar notificación como leída');
      return response.json();
    },
    onSuccess: () => {
      // Invalida la query para que se actualice la lista y el badge
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return {
    notifications,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
  };
};
