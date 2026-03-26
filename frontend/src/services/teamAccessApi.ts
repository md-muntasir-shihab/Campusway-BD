import api from './api';

export type TeamAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'archive'
  | 'publish'
  | 'approve'
  | 'reject'
  | 'verify'
  | 'export'
  | 'import'
  | 'manage_settings'
  | 'manage_permissions'
  | 'manage_security'
  | 'manage_finance'
  | 'manage_users'
  | 'bulk_actions';

export type TeamStatus = 'active' | 'invited' | 'suspended' | 'disabled' | 'pending';

export type ModulePermissionMap = Record<string, Record<string, boolean>>;

export interface TeamRoleItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isSystemRole?: boolean;
  isActive?: boolean;
  basePlatformRole?: string;
  totalUsers?: number;
  modulePermissions?: ModulePermissionMap;
}

export interface TeamMemberItem {
  _id: string;
  full_name?: string;
  fullName?: string;
  email: string;
  phone_number?: string;
  username?: string;
  notes?: string;
  role?: string;
  teamRoleId?: TeamRoleItem | string;
  status?: TeamStatus | string;
  lastLoginAtUTC?: string;
  twoFactorEnabled?: boolean;
  forcePasswordResetRequired?: boolean;
}

export interface TeamApprovalRuleItem {
  _id: string;
  module: string;
  action: string;
  requiresApproval: boolean;
  requiredApprovals?: number;
  description?: string;
  approverRoleIds: Array<{ _id: string; name: string; slug: string } | string>;
}

export interface TeamAuditItem {
  _id: string;
  actorId?: { _id: string; full_name?: string; username?: string; email?: string; role?: string };
  module: string;
  action: string;
  targetType?: string;
  targetId?: string;
  oldValueSummary?: Record<string, unknown>;
  newValueSummary?: Record<string, unknown>;
  status: 'success' | 'failed' | 'blocked';
  ip?: string;
  device?: string;
  createdAt: string;
}

export interface TeamInviteItem {
  _id: string;
  memberId?: string;
  fullName: string;
  email: string;
  phone?: string;
  roleId?: { _id: string; name: string; slug: string };
  status: string;
  invitedBy?: { _id: string; full_name?: string; username?: string };
  expiresAt?: string;
  notes?: string;
  createdAt: string;
}

export interface TeamSecurityOverview {
  items: TeamMemberItem[];
  summary: {
    total: number;
    suspended: number;
    resetRequired: number;
    twoFactorEnabled: number;
  };
}

const BASE = '/admin';

export const teamApi = {
  getMembers: (params?: Record<string, unknown>) => api.get<{ items: TeamMemberItem[] }>(`${BASE}/team/members`, { params }),
  createMember: (payload: Record<string, unknown>) => api.post(`${BASE}/team/members`, payload),
  getMemberById: (id: string) => api.get(`${BASE}/team/members/${id}`),
  updateMember: (id: string, payload: Record<string, unknown>) => api.put(`${BASE}/team/members/${id}`, payload),
  suspendMember: (id: string) => api.post(`${BASE}/team/members/${id}/suspend`),
  activateMember: (id: string) => api.post(`${BASE}/team/members/${id}/activate`),
  resetMemberPassword: (id: string) => api.post<{ inviteSent?: boolean; message?: string }>(`${BASE}/team/members/${id}/reset-password`),
  revokeMemberSessions: (id: string) => api.post(`${BASE}/team/members/${id}/revoke-sessions`),
  resendMemberInvite: (id: string) => api.post(`${BASE}/team/members/${id}/resend-invite`),

  getRoles: () => api.get<{ items: TeamRoleItem[] }>(`${BASE}/team/roles`),
  createRole: (payload: Record<string, unknown>) => api.post(`${BASE}/team/roles`, payload),
  getRoleById: (id: string) => api.get(`${BASE}/team/roles/${id}`),
  updateRole: (id: string, payload: Record<string, unknown>) => api.put(`${BASE}/team/roles/${id}`, payload),
  duplicateRole: (id: string) => api.post(`${BASE}/team/roles/${id}/duplicate`),
  deleteRole: (id: string) => api.delete(`${BASE}/team/roles/${id}`),

  getPermissions: () => api.get<{ modules: string[]; actions: string[]; roles: Array<{ _id: string; name: string; slug: string; permissions: ModulePermissionMap }> }>(`${BASE}/team/permissions`),
  updateRolePermissions: (roleId: string, modulePermissions: ModulePermissionMap) =>
    api.put(`${BASE}/team/permissions/roles/${roleId}`, { modulePermissions }),
  updateMemberOverride: (memberId: string, allow: ModulePermissionMap, deny: ModulePermissionMap) =>
    api.put(`${BASE}/team/permissions/members/${memberId}/override`, { allow, deny }),

  getApprovalRules: () => api.get<{ items: TeamApprovalRuleItem[] }>(`${BASE}/team/approval-rules`),
  createApprovalRule: (payload: Record<string, unknown>) => api.post(`${BASE}/team/approval-rules`, payload),
  updateApprovalRule: (id: string, payload: Record<string, unknown>) => api.put(`${BASE}/team/approval-rules/${id}`, payload),
  deleteApprovalRule: (id: string) => api.delete(`${BASE}/team/approval-rules/${id}`),

  getActivity: (params?: Record<string, unknown>) => api.get<{ items: TeamAuditItem[] }>(`${BASE}/team/activity`, { params }),
  getActivityById: (id: string) => api.get<{ item: TeamAuditItem }>(`${BASE}/team/activity/${id}`),

  getSecurityOverview: () => api.get<TeamSecurityOverview>(`${BASE}/team/security`),
  getInvites: () => api.get<{ items: TeamInviteItem[] }>(`${BASE}/team/invites`),
};
