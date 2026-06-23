import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getStudentProfile, updateStudentProfile, uploadStudentAvatar, changePassword } from '../services/api';

export const profileKeys = {
    all: ['profile'] as const,
    me: () => [...profileKeys.all, 'me'] as const,
};

export function useProfileQuery(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: profileKeys.me(),
        queryFn: async () => {
            const res = await getStudentProfile();
            return res.data;
        },
        staleTime: 30_000,
        ...options,
    });
}

export function useUpdateProfileMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
            const res = await updateStudentProfile(payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: profileKeys.me() }).catch(() => undefined);
        },
    });
}

export function useUploadAvatarMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (formData: FormData) => {
            const res = await uploadStudentAvatar(formData);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: profileKeys.me() }).catch(() => undefined);
        },
    });
}

export function useChangePasswordMutation() {
    return useMutation({
        mutationFn: async (payload: { currentPassword?: string; newPassword?: string }) => {
            const res = await changePassword(payload.currentPassword || '', payload.newPassword || '');
            return res.data;
        },
    });
}
