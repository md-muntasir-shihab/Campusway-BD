import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RequestOtpPayload {
    contactType: 'phone' | 'email';
    contactValue: string;
}

interface VerifyOtpPayload {
    contactType: 'phone' | 'email';
    code: string;
}

interface ResendOtpPayload {
    contactType: 'phone' | 'email';
    contactValue: string;
}

export interface ProfileUpdateRequestStatus {
    _id: string;
    status: 'pending' | 'approved' | 'rejected';
    requested_changes: Record<string, unknown>;
    previous_values: Record<string, unknown>;
    admin_feedback?: string;
    reviewed_at?: string | null;
    createdAt: string;
    updatedAt: string;
}

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const otpKeys = {
    all: ['otp'] as const,
    profileUpdateRequest: () => [...otpKeys.all, 'profile-update-request'] as const,
};

// ─── API Functions ───────────────────────────────────────────────────────────

const requestOtp = (payload: RequestOtpPayload) =>
    api.post('/student/otp/request', payload).then((r) => r.data);

const verifyOtp = (payload: VerifyOtpPayload) =>
    api.post('/student/otp/verify', payload).then((r) => r.data);

const resendOtp = (payload: ResendOtpPayload) =>
    api.post('/student/otp/resend', payload).then((r) => r.data);

const fetchProfileUpdateRequestStatus = (): Promise<{ request: ProfileUpdateRequestStatus | null }> =>
    api.get('/student/profile-update-request').then((r) => r.data);

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useRequestOtp() {
    return useMutation({
        mutationFn: (payload: RequestOtpPayload) => requestOtp(payload),
    });
}

export function useVerifyOtp() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: VerifyOtpPayload) => verifyOtp(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: otpKeys.profileUpdateRequest() }).catch(() => undefined);
        },
    });
}

export function useResendOtp() {
    return useMutation({
        mutationFn: (payload: ResendOtpPayload) => resendOtp(payload),
    });
}

export function useProfileUpdateRequestStatus(enabled = true) {
    return useQuery({
        queryKey: otpKeys.profileUpdateRequest(),
        queryFn: fetchProfileUpdateRequestStatus,
        enabled,
        staleTime: 30_000,
    });
}
