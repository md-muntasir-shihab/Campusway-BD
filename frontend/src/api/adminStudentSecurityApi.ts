/* ─── Student Security / Account Control API Layer ──────── */
import api from '../services/api';

// ─── Types ───────────────────────────────────────────────
export interface StudentSecurityMeta {
  userId: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
  status: string;
  passwordSetByAdmin: boolean;
  passwordLastChangedAtUTC?: string;
  passwordChangedByType?: 'admin' | 'user' | null;
  forcePasswordResetRequired: boolean;
  accountInfoLastSentAtUTC?: string;
  accountInfoLastSentChannels?: string[];
  credentialsLastResentAtUTC?: string;
  lastLoginAt?: string;
  activeSessions: number;
  recentAudit: { action: string; timestamp: string; ip_address?: string }[];
}

// ─── Endpoints ──────────────────────────────────────────

export const getStudentSecurity = (id: string) =>
  api.get(`/admin/students/${id}/security`).then(r => r.data);

export const adminSetPassword = (id: string, data: {
  newPassword: string;
  sendVia?: string[];
  forceReset?: boolean;
}) => api.post(`/admin/students/${id}/set-password`, data).then(r => r.data);

export const createStudentWithPassword = (data: {
  full_name: string;
  email?: string;
  phone_number?: string;
  password: string;
  sendVia?: string[];
}) => api.post('/admin/students/create-with-password', data).then(r => r.data);

export const resendAccountInfo = (id: string, data: { channels: string[] }) =>
  api.post(`/admin/students/${id}/resend-account-info`, data).then(r => r.data);

export const toggleForceReset = (id: string, data: { enabled: boolean }) =>
  api.post(`/admin/students/${id}/force-reset`, { force: data.enabled }).then(r => r.data);

export const revokeStudentSessions = (id: string) =>
  api.post(`/admin/students/${id}/revoke-sessions`).then(r => r.data);
