import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from './http';
import { HomePayload } from '../types/home';

export const usePublicSettingsQuery = () =>
  useQuery({ queryKey: ['publicSettings'], queryFn: async () => (await http.get('/settings/public')).data.data });

export const useHomeQuery = () =>
  useQuery<HomePayload>({
    queryKey: ['home'],
    queryFn: async () => (await http.get('/home')).data.data,
    refetchInterval: 90_000
  });

export const useSaveHomeSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: unknown) =>
      (await http.put('/admin/settings/home', payload, { headers: { Authorization: 'Bearer dev-admin-token' } })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home'] });
      queryClient.invalidateQueries({ queryKey: ['publicSettings'] });
    }
  });
};
