import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import AdminGuardShell from '../../../components/admin/AdminGuardShell';
import { useModuleAccess } from '../../../hooks/useModuleAccess';
import {
  teamApi,
  type TeamRoleItem,
  type ModulePermissionMap,
} from '../../../services/teamAccessApi';
import {
  ArrowLeft, Shield, Users, Lock, Save, Copy, Trash2, CheckCircle2,
} from 'lucide-react';
import { ADMIN_PATHS } from '../../../routes/adminPaths';
import AdminGuideButton, { type AdminGuideButtonProps } from '../../../components/admin/AdminGuideButton';

type DetailTab = 'overview' | 'permissions' | 'members';
type InlineGuide = Omit<AdminGuideButtonProps, 'variant' | 'tone'>;

const TABS: { key: DetailTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: Shield },
  { key: 'permissions', label: 'Permissions', icon: Lock },
  { key: 'members', label: 'Members', icon: Users },
];

const ROLE_GUIDES: Record<DetailTab | 'duplicate' | 'delete' | 'saveOverview' | 'savePermissions', InlineGuide> = {
  overview: { title: 'Overview Tab', content: 'Review and edit the role identity, description, and base platform role.', affected: 'Role configuration and downstream team assignment.' },
  permissions: { title: 'Permissions Tab', content: 'Manage per-module action access granted by this role.', affected: 'Admin route and action access for members using this role.' },
  members: { title: 'Members Tab', content: 'Review the members currently assigned to this role.', affected: 'Team member review only.' },
  duplicate: { title: 'Duplicate Role', content: 'Create a copied version of this role for faster setup of a similar permission set.', affected: 'Team role catalog.' },
  delete: { title: 'Delete Role', content: 'Delete this role and unassign members from it after confirmation.', affected: 'This role record and any member currently assigned to it.' },
  saveOverview: { title: 'Save Role Changes', content: 'Persist the current role name, description, and base role changes.', affected: 'This role configuration.' },
  savePermissions: { title: 'Save Permissions', content: 'Persist the permission matrix currently configured for this role.', affected: 'Admin access for all members using this role.' },
};

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasAccess } = useModuleAccess();
  const [tab, setTab] = useState<DetailTab>('overview');
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<TeamRoleItem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', basePlatformRole: 'viewer' });
  const [permissions, setPermissions] = useState<ModulePermissionMap>({});
  const [modules, setModules] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const canCreateTeam = hasAccess('team_access_control', 'create');
  const canEditTeam = hasAccess('team_access_control', 'edit');
  const canDeleteTeam = hasAccess('team_access_control', 'delete');

  async function loadRole() {
    if (!id) return;
    setLoading(true);
    try {
      const res = await teamApi.getRoleById(id);
      const payload = res.data as {
        item?: TeamRoleItem;
        data?: TeamRoleItem | { item?: TeamRoleItem };
        permissions?: ModulePermissionMap;
        users?: unknown[];
      };
      const dataValue = payload.data;
      const roleItem = payload.item
        ?? (typeof dataValue === 'object' && dataValue && 'item' in dataValue ? dataValue.item : undefined)
        ?? (typeof dataValue === 'object' && dataValue ? dataValue as TeamRoleItem : undefined);
      if (!roleItem) {
        throw new Error('Role payload missing');
      }
      const r: TeamRoleItem = {
        ...roleItem,
        totalUsers: roleItem.totalUsers ?? (Array.isArray(payload.users) ? payload.users.length : 0),
      };
      setRole(r);
      setEditForm({ name: r.name, description: r.description || '', basePlatformRole: r.basePlatformRole || 'viewer' });
      setPermissions(payload.permissions || r.modulePermissions || {});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load role');
    } finally {
      setLoading(false);
    }
  }

  async function loadPermissionMatrix() {
    try {
      const res = await teamApi.getPermissions();
      setModules(res.data.modules || []);
      setActions(res.data.actions || []);
    } catch {
      // Non-critical
    }
  }

  useEffect(() => {
    void loadRole();
    void loadPermissionMatrix();
  }, [id]);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    try {
      await teamApi.updateRole(id, { name: editForm.name, description: editForm.description, basePlatformRole: editForm.basePlatformRole });
      toast.success('Role updated');
      await loadRole();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePermissions() {
    if (!id || !role) return;
    setSaving(true);
    try {
      await teamApi.updateRolePermissions(id, permissions);
      toast.success('Permissions saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  }

  async function handleDuplicate() {
    if (!id) return;
    try {
      await teamApi.duplicateRole(id);
      toast.success('Role duplicated');
      navigate(ADMIN_PATHS.teamRoles);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to duplicate');
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!window.confirm('Delete this role? Members with this role will become unassigned.')) return;
    try {
      await teamApi.deleteRole(id);
      toast.success('Role deleted');
      navigate(ADMIN_PATHS.teamRoles);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    }
  }

  function togglePerm(mod: string, act: string) {
    setPermissions((prev) => ({
      ...prev,
      [mod]: { ...prev[mod], [act]: !(prev[mod]?.[act]) },
    }));
  }

  function toggleModuleAll(mod: string) {
    const allOn = actions.every((a) => permissions[mod]?.[a]);
    setPermissions((prev) => ({
      ...prev,
      [mod]: Object.fromEntries(actions.map((a) => [a, !allOn])),
    }));
  }

  return (
    <AdminGuardShell
      title="Role Detail"
      description="View and manage role configuration and permissions."
      allowedRoles={['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent']}
      requiredModule="team_access_control"
    >
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <button onClick={() => navigate(ADMIN_PATHS.teamRoles)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to Roles
        </button>

        {loading && <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">Loading role details...</div>}

        {!loading && role && (
          <>
            {/* Header */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{role.name}</h2>
                    {role.isSystemRole && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">System</span>}
                  </div>
                  {role.description && <p className="mt-1 text-sm text-slate-500">{role.description}</p>}
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {role.totalUsers || 0} members</span>
                    <span>Base: <span className="font-medium text-slate-700 dark:text-slate-300">{role.basePlatformRole}</span></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {canCreateTeam && <div className="flex items-center gap-1"><button onClick={handleDuplicate} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"><Copy className="h-3.5 w-3.5" /> Duplicate</button><AdminGuideButton {...ROLE_GUIDES.duplicate} tone="indigo" /></div>}
                  {!role.isSystemRole && canDeleteTeam && (
                    <div className="flex items-center gap-1"><button onClick={handleDelete} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/30"><Trash2 className="h-3.5 w-3.5" /> Delete</button><AdminGuideButton {...ROLE_GUIDES.delete} tone="indigo" /></div>
                  )}
                </div>
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
                  <AdminGuideButton {...ROLE_GUIDES[key]} tone="indigo" />
                </div>
              ))}
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Role Configuration</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Role Name</label>
                    <input className="admin-input w-full" value={editForm.name} onChange={(e) => setEditForm(v => ({ ...v, name: e.target.value }))} disabled={role.isSystemRole || !canEditTeam} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Base Platform Role</label>
                    <select className="admin-input w-full" value={editForm.basePlatformRole} onChange={(e) => setEditForm(v => ({ ...v, basePlatformRole: e.target.value }))} disabled={role.isSystemRole || !canEditTeam}>
                      <option value="viewer">viewer</option>
                      <option value="editor">editor</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                      <option value="support_agent">support_agent</option>
                      <option value="finance_agent">finance_agent</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs text-slate-500">Description</label>
                    <textarea className="admin-input w-full" rows={3} value={editForm.description} onChange={(e) => setEditForm(v => ({ ...v, description: e.target.value }))} disabled={role.isSystemRole || !canEditTeam} />
                  </div>
                </div>
                {!role.isSystemRole && canEditTeam && (
                  <div className="mt-3 flex items-center gap-1">
                    <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                      <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <AdminGuideButton {...ROLE_GUIDES.saveOverview} tone="indigo" />
                  </div>
                )}
              </div>
            )}

            {/* Permissions Tab */}
            {tab === 'permissions' && (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">Module</th>
                        {actions.map((a) => (
                          <th key={a} className="px-2 py-2 text-center text-xs font-semibold capitalize text-slate-600 dark:text-slate-400">{a.replace(/_/g, ' ')}</th>
                        ))}
                        <th className="px-2 py-2 text-center text-xs font-semibold text-slate-600 dark:text-slate-400">Toggle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((mod) => (
                        <tr key={mod} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 text-xs font-medium capitalize text-slate-900 dark:text-slate-100">{mod.replace(/_/g, ' ')}</td>
                          {actions.map((act) => (
                            <td key={act} className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={!!permissions[mod]?.[act]}
                                disabled={!canEditTeam}
                                onChange={() => togglePerm(mod, act)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                          ))}
                          <td className="px-2 py-2 text-center">
                            {canEditTeam ? (
                              <button onClick={() => toggleModuleAll(mod)} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                                {actions.every((a) => permissions[mod]?.[a]) ? 'None' : 'All'}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500">View only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {canEditTeam && (
                  <div className="flex items-center gap-1">
                    <button onClick={handleSavePermissions} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                      <CheckCircle2 className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Permissions'}
                    </button>
                    <AdminGuideButton {...ROLE_GUIDES.savePermissions} tone="indigo" />
                  </div>
                )}
              </div>
            )}

            {/* Members Tab */}
            {tab === 'members' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Members with this role ({role.totalUsers || 0})</h3>
                <p className="text-xs text-slate-500">
                  Members assigned to this role inherit all configured permissions.
                  To view or manage individual members, go to the Team Members list.
                </p>
                <button onClick={() => navigate(ADMIN_PATHS.teamMembers)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                  <Users className="h-3.5 w-3.5" /> View Team Members
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !role && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
            Role not found
          </div>
        )}
      </motion.div>
    </AdminGuardShell>
  );
}
