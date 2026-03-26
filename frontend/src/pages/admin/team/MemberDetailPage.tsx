import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AdminGuardShell from '../../../components/admin/AdminGuardShell';
import { useModuleAccess } from '../../../hooks/useModuleAccess';
import {
  teamApi,
  type TeamMemberItem,
  type TeamRoleItem,
  type TeamAuditItem,
} from '../../../services/teamAccessApi';
import {
  ArrowLeft, Shield, Users, Lock, Activity, Mail,
  XCircle, AlertTriangle,
  Fingerprint, KeyRound, UserCheck, UserX, Save,
} from 'lucide-react';
import { ADMIN_PATHS } from '../../../routes/adminPaths';
import AdminGuideButton, { type AdminGuideButtonProps } from '../../../components/admin/AdminGuideButton';

type DetailTab = 'overview' | 'role' | 'activity' | 'security' | 'notes';
type InlineGuide = Omit<AdminGuideButtonProps, 'variant' | 'tone'>;

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    revoked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    invited: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
      {status}
    </span>
  );
}

const TABS: { key: DetailTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: Users },
  { key: 'role', label: 'Role & Permissions', icon: Shield },
  { key: 'activity', label: 'Activity Log', icon: Activity },
  { key: 'security', label: 'Login & Security', icon: Lock },
  { key: 'notes', label: 'Notes', icon: Mail },
];

const MEMBER_GUIDES: Record<DetailTab | 'activate' | 'suspend' | 'reset' | 'revoke', InlineGuide> = {
  overview: { title: 'Overview Tab', content: 'Review the member summary and editable account details.', affected: 'Current admin review and member profile data.' },
  role: { title: 'Role & Permissions Tab', content: 'Review the linked role and permission scope for this member.', affected: 'Team-access visibility and operational permissions.' },
  activity: { title: 'Activity Log Tab', content: 'Review recent audit activity for this member account.', affected: 'Team audit review only.' },
  security: { title: 'Login & Security Tab', content: 'Review login and security posture for this member.', affected: 'Member account protection and support operations.' },
  notes: { title: 'Notes Tab', content: 'Review or manage notes related to this team member.', affected: 'Team member internal notes.' },
  activate: { title: 'Activate Member', content: 'Restore active access for this team member account.', affected: 'Admin access for the selected member.' },
  suspend: { title: 'Suspend Member', content: 'Suspend this member account and stop normal access until reactivated.', affected: 'Admin access for the selected member.' },
  reset: { title: 'Reset Password', content: 'Trigger a password reset flow for this team member.', affected: 'The selected member account and its next login.' },
  revoke: { title: 'Revoke Sessions', content: 'Invalidate active sessions for this team member account.', affected: 'Current active sessions for the selected member.' },
};

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasAccess } = useModuleAccess();
  const [tab, setTab] = useState<DetailTab>('overview');
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<TeamMemberItem | null>(null);
  const [roles, setRoles] = useState<TeamRoleItem[]>([]);
  const [activityItems, setActivityItems] = useState<TeamAuditItem[]>([]);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '', notes: '', roleId: '' });
  const [saving, setSaving] = useState(false);
  const canCreateTeam = hasAccess('team_access_control', 'create');
  const canEditTeam = hasAccess('team_access_control', 'edit');

  async function loadMember() {
    if (!id) return;
    setLoading(true);
    try {
      const [memberRes, roleRes] = await Promise.all([
        teamApi.getMemberById(id),
        teamApi.getRoles(),
      ]);
      const payload = memberRes.data as {
        item?: TeamMemberItem;
        data?: TeamMemberItem | { item?: TeamMemberItem };
        logs?: TeamAuditItem[];
      };
      const dataValue = payload.data;
      const m = payload.item
        ?? (typeof dataValue === 'object' && dataValue && 'item' in dataValue ? dataValue.item : undefined)
        ?? (typeof dataValue === 'object' && dataValue ? dataValue as TeamMemberItem : undefined);
      if (!m) {
        throw new Error('Member payload missing');
      }
      setMember(m);
      setRoles(roleRes.data.items || []);
      setActivityItems(Array.isArray(payload.logs) ? payload.logs : []);
      setEditForm({
        fullName: m.full_name || m.fullName || '',
        email: m.email || '',
        phone: m.phone_number || '',
        notes: m.notes || '',
        roleId: typeof m.teamRoleId === 'object' && m.teamRoleId ? m.teamRoleId._id : (m.teamRoleId as string) || '',
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load member');
    } finally {
      setLoading(false);
    }
  }

  async function loadActivity() {
    if (!id) return;
    try {
      const res = await teamApi.getActivity({ targetId: id, limit: 50 });
      setActivityItems(res.data.items || []);
    } catch {
      // Activity load failure is non-critical
    }
  }

  useEffect(() => {
    void loadMember();
  }, [id]);

  useEffect(() => {
    if (tab === 'activity') void loadActivity();
  }, [tab, id]);

  const displayName = member?.full_name || member?.fullName || member?.email || '';
  const roleName = useMemo(() => {
    if (member?.teamRoleId && typeof member.teamRoleId === 'object' && 'name' in member.teamRoleId) return member.teamRoleId.name;
    if (typeof member?.teamRoleId === 'string') {
      const selected = roles.find((item) => item._id === member.teamRoleId);
      if (selected?.name) return selected.name;
    }
    return 'Unassigned';
  }, [member, roles]);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    try {
      await teamApi.updateMember(id, {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone,
        notes: editForm.notes,
        roleId: editForm.roleId || undefined,
      });
      toast.success('Member updated');
      await loadMember();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update member');
    } finally {
      setSaving(false);
    }
  }

  async function handleAction(action: 'suspend' | 'activate' | 'reset' | 'revoke') {
    if (!id) return;
    try {
      if (action === 'suspend') await teamApi.suspendMember(id);
      if (action === 'activate') await teamApi.activateMember(id);
      if (action === 'reset') {
        const res = await teamApi.resetMemberPassword(id);
        toast.success(res.data.message || (res.data.inviteSent ? 'Password reset link sent' : 'Password reset prepared'));
        await loadMember();
        return;
      }
      if (action === 'revoke') await teamApi.revokeMemberSessions(id);
      toast.success('Action completed');
      await loadMember();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Action failed');
    }
  }

  return (
    <AdminGuardShell
      title="Team Member Detail"
      description="View and manage individual team member profile, role, permissions, and security."
      allowedRoles={['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent']}
      requiredModule="team_access_control"
    >
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Back button */}
        <button onClick={() => navigate(ADMIN_PATHS.teamMembers)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to Team Members
        </button>

        {loading && <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">Loading member details...</div>}

        {!loading && member && (
          <>
            {/* Header card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {getInitials(displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{displayName}</h2>
                  <p className="text-sm text-slate-500">{member.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                      <Shield className="h-3 w-3" /> {roleName}
                    </span>
                    <StatusBadge status={member.status || 'active'} />
                    {member.twoFactorEnabled && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Fingerprint className="h-3 w-3" /> 2FA</span>
                    )}
                  </div>
                </div>
                {canCreateTeam && (
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1"><button onClick={() => handleAction('activate')} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"><UserCheck className="h-3.5 w-3.5" /> Activate</button><AdminGuideButton {...MEMBER_GUIDES.activate} tone="indigo" /></div>
                    <div className="flex items-center gap-1"><button onClick={() => handleAction('suspend')} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"><UserX className="h-3.5 w-3.5" /> Suspend</button><AdminGuideButton {...MEMBER_GUIDES.suspend} tone="indigo" /></div>
                    <div className="flex items-center gap-1"><button onClick={() => handleAction('reset')} className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-xs text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400"><KeyRound className="h-3.5 w-3.5" /> Reset Password</button><AdminGuideButton {...MEMBER_GUIDES.reset} tone="indigo" /></div>
                    <div className="flex items-center gap-1"><button onClick={() => handleAction('revoke')} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400"><Lock className="h-3.5 w-3.5" /> Revoke Sessions</button><AdminGuideButton {...MEMBER_GUIDES.revoke} tone="indigo" /></div>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              {TABS.map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center gap-1">
                  <button
                    onClick={() => setTab(key)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      tab === key
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                  <AdminGuideButton {...MEMBER_GUIDES[key]} tone="indigo" />
                </div>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'overview' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Profile Information</h3>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Full Name</label>
                    <input className="admin-input w-full" value={editForm.fullName} onChange={(e) => setEditForm(v => ({ ...v, fullName: e.target.value }))} disabled={!canEditTeam} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Email</label>
                    <input className="admin-input w-full" value={editForm.email} onChange={(e) => setEditForm(v => ({ ...v, email: e.target.value }))} disabled={!canEditTeam} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Phone</label>
                    <input className="admin-input w-full" value={editForm.phone} onChange={(e) => setEditForm(v => ({ ...v, phone: e.target.value }))} disabled={!canEditTeam} />
                  </div>
                  {canEditTeam && (
                    <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                      <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Account Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Username</span><span className="font-medium text-slate-900 dark:text-slate-100">{member.username || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={member.status || 'active'} /></div>
                    <div className="flex justify-between"><span className="text-slate-500">Last Login</span><span className="text-slate-700 dark:text-slate-300">{member.lastLoginAtUTC ? relativeTime(member.lastLoginAtUTC) : 'Never'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">2FA</span><span>{member.twoFactorEnabled ? <span className="text-emerald-600">Enabled</span> : <span className="text-slate-400">Disabled</span>}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Password Reset Required</span><span>{member.forcePasswordResetRequired ? <span className="text-amber-600">Yes</span> : <span className="text-slate-400">No</span>}</span></div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'role' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Assign Role</h3>
                  <div className="flex items-center gap-3">
                    <select className="admin-input max-w-xs" value={editForm.roleId} onChange={(e) => setEditForm(v => ({ ...v, roleId: e.target.value }))} disabled={!canEditTeam}>
                      <option value="">No role assigned</option>
                      {roles.map((role) => <option key={role._id} value={role._id}>{role.name}{role.isSystemRole ? ' (System)' : ''}</option>)}
                    </select>
                    {canEditTeam && (
                      <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                        <Save className="h-4 w-4" /> Save
                      </button>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Current Role: {roleName}</h3>
                  <p className="text-xs text-slate-500">
                    This member&apos;s permissions are determined by their assigned team role.
                    To view or edit the role&apos;s permissions, go to the Permissions Matrix view.
                  </p>
                </div>
              </div>
            )}

            {tab === 'activity' && (
              <div className="space-y-2">
                {activityItems.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                    <Activity className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                    No activity recorded for this member
                  </div>
                )}
                {activityItems.map((item) => (
                  <div key={item._id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <Activity className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900 dark:text-slate-100">
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">{item.action}</span>{' '}
                        <span className="text-slate-500">on</span>{' '}
                        <span className="font-medium">{item.module}</span>
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge status={item.status} />
                        {item.ip && <span className="text-xs text-slate-400">IP: {item.ip}</span>}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">{relativeTime(item.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'security' && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2"><Fingerprint className="h-4 w-4 text-slate-400" /><p className="text-xs text-slate-500">Two-Factor Auth</p></div>
                    <p className="mt-1 text-lg font-bold">{member.twoFactorEnabled ? <span className="text-emerald-600">Enabled</span> : <span className="text-slate-400">Disabled</span>}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-slate-400" /><p className="text-xs text-slate-500">Password Reset</p></div>
                    <p className="mt-1 text-lg font-bold">{member.forcePasswordResetRequired ? <span className="text-amber-600">Required</span> : <span className="text-slate-400">Not Required</span>}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-slate-400" /><p className="text-xs text-slate-500">Account Status</p></div>
                    <p className="mt-1"><StatusBadge status={member.status || 'active'} /></p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-slate-400" /><p className="text-xs text-slate-500">Last Login</p></div>
                    <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{member.lastLoginAtUTC ? relativeTime(member.lastLoginAtUTC) : 'Never'}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Security Actions</h3>
                  {canCreateTeam && (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleAction('reset')} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"><KeyRound className="h-3.5 w-3.5" /> Reset Password</button>
                      <button onClick={() => handleAction('revoke')} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"><Lock className="h-3.5 w-3.5" /> Revoke All Sessions</button>
                      {member.status === 'suspended'
                        ? <button onClick={() => handleAction('activate')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"><UserCheck className="h-3.5 w-3.5" /> Activate Account</button>
                        : <button onClick={() => handleAction('suspend')} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500"><UserX className="h-3.5 w-3.5" /> Suspend Account</button>
                      }
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'notes' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Internal Notes</h3>
                <textarea
                  className="admin-input w-full"
                  rows={6}
                  placeholder="Add internal notes about this member (not visible to the member)..."
                  value={editForm.notes}
                  disabled={!canEditTeam}
                  onChange={(e) => setEditForm(v => ({ ...v, notes: e.target.value }))}
                />
                {canEditTeam && (
                  <button onClick={handleSave} disabled={saving} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                    <Save className="h-4 w-4" /> Save Notes
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {!loading && !member && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
            <XCircle className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
            Member not found
          </div>
        )}
      </motion.div>
    </AdminGuardShell>
  );
}
