import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Shield, UserX, UserCheck, Loader2, Edit, AlertCircle, Users, CheckCircle, Ban, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminGetUsers, adminUpdateUserRole, adminBanUser, adminUnbanUser } from '../../../services/api';
import { SEO } from '../../../components/common/SEO';

const ROLE_COLORS: Record<string, string> = {
    superadmin: 'bg-red-500/10 text-red-500 border border-red-500/20',
    admin: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
    moderator: 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
    chairman: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
    student: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    editor: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    viewer: 'bg-slate-500/10 text-slate-500 border border-slate-500/20',
    support_agent: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20',
    finance_agent: 'bg-pink-500/10 text-pink-500 border border-pink-500/20',
};

const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-500',
    suspended: 'bg-rose-500/10 text-rose-500',
    blocked: 'bg-slate-500/10 text-slate-500',
    pending: 'bg-amber-500/10 text-amber-500',
};

export default function AdminUserManagementPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(15);

    // Selected user for role change dialog
    const [roleModalState, setRoleModalState] = useState<{
        open: boolean;
        userId: string;
        userName: string;
        currentRole: string;
        newRole: string;
    }>({
        open: false,
        userId: '',
        userName: '',
        currentRole: '',
        newRole: '',
    });

    // Fetch users with filters
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['admin-users', page, searchTerm, roleFilter, statusFilter],
        queryFn: async () => {
            const res = await adminGetUsers({
                page,
                limit,
                search: searchTerm || undefined,
                role: roleFilter || undefined,
                status: statusFilter || undefined,
            });
            return res.data;
        },
        staleTime: 10_000,
    });

    // Mutations
    const updateRoleMutation = useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: string }) => adminUpdateUserRole(userId, role),
        onSuccess: () => {
            toast.success('User role updated successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] }).catch(() => undefined);
            setRoleModalState(prev => ({ ...prev, open: false }));
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error?.message || 'Failed to update user role');
        },
    });

    const banUserMutation = useMutation({
        mutationFn: (userId: string) => adminBanUser(userId),
        onSuccess: () => {
            toast.success('User suspended successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] }).catch(() => undefined);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error?.message || 'Failed to suspend user');
        },
    });

    const unbanUserMutation = useMutation({
        mutationFn: (userId: string) => adminUnbanUser(userId),
        onSuccess: () => {
            toast.success('User activated successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-users'] }).catch(() => undefined);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error?.message || 'Failed to activate user');
        },
    });

    // Summary stats from users data if available
    const items = data?.items || [];
    const totalCount = data?.total || 0;
    const totalPages = data?.pages || Math.max(1, Math.ceil(totalCount / limit));

    return (
        <div className="space-y-6">
            <SEO title="User Management - Admin" description="System user accounts management and security panel." />
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="w-7 h-7 text-indigo-500" />
                        User Management
                    </h1>
                    <p className="text-slate-500 mt-1">Manage system user credentials, status, and role access permissions.</p>
                </div>
            </div>

            {/* Quick Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Records</p>
                        <p className="text-2xl font-bold text-slate-950 dark:text-white mt-0.5">{totalCount}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Active Accounts</p>
                        <p className="text-2xl font-bold text-slate-950 dark:text-white mt-0.5">
                            {isLoading ? '...' : items.filter((u: any) => u.status === 'active').length}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex items-center gap-4">
                    <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl text-rose-600 dark:text-rose-400">
                        <Ban className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Suspended</p>
                        <p className="text-2xl font-bold text-slate-950 dark:text-white mt-0.5">
                            {isLoading ? '...' : items.filter((u: any) => u.status === 'suspended').length}
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 flex items-center gap-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pending Review</p>
                        <p className="text-2xl font-bold text-slate-950 dark:text-white mt-0.5">
                            {isLoading ? '...' : items.filter((u: any) => u.status === 'pending').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search name, email, user ID..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        aria-label="Search users"
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 bg-slate-50 dark:bg-slate-900/50 dark:text-white text-sm"
                    />
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <select
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                            aria-label="Filter by role"
                            className="bg-transparent outline-none dark:text-white text-slate-700 font-medium"
                        >
                            <option value="">All Roles</option>
                            <option value="superadmin">Superadmin</option>
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderator</option>
                            <option value="chairman">Chairman</option>
                            <option value="student">Student</option>
                            <option value="support_agent">Support Agent</option>
                            <option value="finance_agent">Finance Agent</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm">
                        <Filter className="w-4 h-4 text-slate-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            aria-label="Filter by status"
                            className="bg-transparent outline-none dark:text-white text-slate-700 font-medium"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="blocked">Blocked</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-24 text-slate-500">
                        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-2" />
                        <span>Fetching system users...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center p-24 text-red-500">
                        <AlertCircle className="w-10 h-10 mb-2" />
                        <span>Failed to fetch users. Please reload.</span>
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-24 text-slate-500">
                        <Users className="w-12 h-12 opacity-40 mb-2" />
                        <span>No users match your criteria.</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Created Date</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {items.map((user: any) => (
                                    <tr key={user._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-600">
                                                {user.profile_photo ? (
                                                    <img src={user.profile_photo} alt={user.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="font-bold text-slate-500 dark:text-slate-400">
                                                        {(user.full_name || 'U').slice(0, 1).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white text-sm">{user.full_name}</div>
                                                <div className="text-xs text-slate-500">{user.email || user.username}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-550 dark:text-slate-400">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'n/a'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${ROLE_COLORS[user.role] || 'bg-slate-100 text-slate-600'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[user.status] || 'bg-slate-100'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : user.status === 'suspended' ? 'bg-rose-500' : 'bg-slate-400'}`}></span>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setRoleModalState({
                                                        open: true,
                                                        userId: user._id,
                                                        userName: user.full_name,
                                                        currentRole: user.role,
                                                        newRole: user.role,
                                                    })}
                                                    title="Change Role"
                                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-500 hover:text-indigo-600 dark:hover:text-white transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>

                                                {user.status === 'suspended' ? (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(`Activate ${user.full_name}?`)) {
                                                                unbanUserMutation.mutate(user._id);
                                                            }
                                                        }}
                                                        title="Activate User"
                                                        className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(`Are you sure you want to suspend/ban ${user.full_name}?`)) {
                                                                banUserMutation.mutate(user._id);
                                                            }
                                                        }}
                                                        title="Suspend User"
                                                        className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                                    >
                                                        <UserX className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm">
                        <span className="text-slate-500">Showing page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 dark:text-white"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 dark:text-white"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Role Modal */}
            {roleModalState.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 relative shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Change User Role</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            Modify access permissions for <strong className="text-slate-800 dark:text-slate-200">{roleModalState.userName}</strong>.
                        </p>

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Select Role</label>
                                <select
                                    value={roleModalState.newRole}
                                    onChange={(e) => setRoleModalState({ ...roleModalState, newRole: e.target.value })}
                                    aria-label="Select role"
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 dark:text-white text-sm font-semibold"
                                >
                                    <option value="student">Student</option>
                                    <option value="chairman">Chairman</option>
                                    <option value="finance_agent">Finance Agent</option>
                                    <option value="support_agent">Support Agent</option>
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                    <option value="moderator">Moderator</option>
                                    <option value="admin">Admin</option>
                                    <option value="superadmin">Superadmin</option>
                                </select>
                            </div>

                            {roleModalState.newRole !== roleModalState.currentRole && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex gap-2 text-xs text-amber-700 dark:text-amber-400">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <p>Updating the user's role will adjust their system privileges and sync their profile data automatically.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setRoleModalState(prev => ({ ...prev, open: false }))}
                                className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 dark:border-slate-700 dark:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => updateRoleMutation.mutate({
                                    userId: roleModalState.userId,
                                    role: roleModalState.newRole,
                                })}
                                disabled={updateRoleMutation.isPending || roleModalState.newRole === roleModalState.currentRole}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-indigo-600/10"
                            >
                                {updateRoleMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Save Role
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
