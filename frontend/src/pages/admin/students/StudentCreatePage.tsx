import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Send, X, Search, Plus, Users, CreditCard } from 'lucide-react';
import { createStudent, getStudentGroups } from '../../../api/adminStudentApi';
import { adminUi } from '../../../lib/appRoutes';
import { adminGetSubscriptionPlans, type AdminSubscriptionPlan } from '../../../services/api';
import ModernToggle from '../../../components/ui/ModernToggle';

const DEPARTMENTS = ['science', 'arts', 'commerce'] as const;
const GENDERS = ['male', 'female', 'other'] as const;
const PAYMENT_METHODS = ['cash', 'bkash', 'nagad', 'bank', 'card', 'manual'] as const;

interface GroupOption { _id: string; name: string; color?: string; type?: string; studentCount?: number }

export default function StudentCreatePage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    full_name: '', email: '', phone_number: '', password: 'CampusWay@2024',
    department: '', ssc_batch: '', hsc_batch: '', college_name: '',
    guardian_name: '', guardian_phone: '', guardian_email: '',
    gender: '', dob: '', district: '', present_address: '',
    planId: '', sendCredentials: false,
    groupIds: [] as string[],
    recordPayment: false, paymentAmount: '', paymentMethod: '',
  });

  // Cache of selected groups for display
  const [selectedGroups, setSelectedGroups] = useState<GroupOption[]>([]);

  const { data: plans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => (await adminGetSubscriptionPlans()).data.items ?? [],
  });

  const { data: groupsData } = useQuery({
    queryKey: ['student-groups-list'],
    queryFn: () => getStudentGroups(),
  });
  const groupsPayload = (groupsData ?? {}) as Record<string, unknown>;
  const allGroups: GroupOption[] = Array.isArray(groupsPayload.data)
    ? groupsPayload.data as GroupOption[]
    : Array.isArray(groupsPayload.groups)
      ? groupsPayload.groups as GroupOption[]
      : Array.isArray(groupsPayload.items)
        ? groupsPayload.items as GroupOption[]
        : Array.isArray(groupsData)
          ? groupsData as GroupOption[]
          : [];

  const filteredGroups = allGroups.filter(
    g => !form.groupIds.includes(g._id) &&
      g.name.toLowerCase().includes(groupSearch.toLowerCase()),
  );

  const mutation = useMutation({
    mutationFn: () => createStudent({
      ...form,
      planId: form.planId || undefined,
      groupIds: form.groupIds.length ? form.groupIds : undefined,
      recordPayment: form.recordPayment,
      paymentAmount: form.paymentAmount ? Number(form.paymentAmount) : undefined,
      paymentMethod: form.paymentMethod || undefined,
    }),
    onSuccess: (data) => {
      const studentId = data?.student?._id || data?.user?._id;
      navigate(studentId ? adminUi(`student-management/students/${studentId}`) : adminUi('student-management/list'));
    },
  });

  const set = (field: string, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const addGroup = (group: GroupOption) => {
    setForm(prev => ({ ...prev, groupIds: [...prev.groupIds, group._id] }));
    setSelectedGroups(prev => [...prev, group]);
    setGroupSearch('');
    setShowGroupDropdown(false);
  };

  const removeGroup = (id: string) => {
    setForm(prev => ({ ...prev, groupIds: prev.groupIds.filter(g => g !== id) }));
    setSelectedGroups(prev => prev.filter(g => g._id !== id));
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400';
  const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
          <UserPlus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create New Student</h2>
          <p className="text-xs text-slate-500">Fill in the details to create a student account</p>
        </div>
      </div>

      <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="space-y-6">
        {/* Account Info */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Account Information</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input className={inputCls} required value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Student full name" />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input className={inputCls} type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="student@example.com" />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input className={inputCls} value={form.phone_number} onChange={e => set('phone_number', e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <label className={labelCls}>Password *</label>
              <div className="relative">
                <input aria-label="Password" title="Password" className={inputCls} type={showPassword ? 'text' : 'password'} required minLength={6} value={form.password} onChange={e => set('password', e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-2 text-slate-400 hover:text-slate-600" title={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Profile Info */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Profile Details</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={labelCls}>Department</label>
              <select aria-label="Department" title="Department" className={inputCls} value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Gender</label>
              <select aria-label="Gender" title="Gender" className={inputCls} value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="">Select</option>
                {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date of Birth</label>
              <input aria-label="Date of Birth" title="Date of Birth" className={inputCls} type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>SSC Batch</label>
              <input aria-label="SSC Batch" title="SSC Batch" className={inputCls} value={form.ssc_batch} onChange={e => set('ssc_batch', e.target.value)} placeholder="e.g. 2023" />
            </div>
            <div>
              <label className={labelCls}>HSC Batch</label>
              <input aria-label="HSC Batch" title="HSC Batch" className={inputCls} value={form.hsc_batch} onChange={e => set('hsc_batch', e.target.value)} placeholder="e.g. 2025" />
            </div>
            <div>
              <label className={labelCls}>College Name</label>
              <input aria-label="College name" title="College name" className={inputCls} value={form.college_name} onChange={e => set('college_name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>District</label>
              <input aria-label="District" title="District" className={inputCls} value={form.district} onChange={e => set('district', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Present Address</label>
              <input aria-label="Present address" title="Present address" className={inputCls} value={form.present_address} onChange={e => set('present_address', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Guardian Info */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Guardian Information</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Guardian Name</label>
              <input aria-label="Guardian name" title="Guardian name" className={inputCls} value={form.guardian_name} onChange={e => set('guardian_name', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Guardian Phone</label>
              <input aria-label="Guardian phone" title="Guardian phone" className={inputCls} value={form.guardian_phone} onChange={e => set('guardian_phone', e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <label className={labelCls}>Guardian Email</label>
              <input aria-label="Guardian email" title="Guardian email" className={inputCls} type="email" value={form.guardian_email} onChange={e => set('guardian_email', e.target.value)} />
            </div>
          </div>
        </section>

        {/* Group Assignment */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <Users size={16} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Group Assignment</h3>
          </div>

          {/* Selected groups badges */}
          {selectedGroups.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedGroups.map(g => (
                <span
                  key={g._id}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: `${g.color || '#6366f1'}20`, color: g.color || '#6366f1' }}
                >
                  {g.name}
                  <button type="button" onClick={() => removeGroup(g._id)} className="ml-0.5 hover:opacity-70" title="Remove group">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative" ref={groupRef}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                className={`${inputCls} pl-8`}
                placeholder="Search and add groups..."
                value={groupSearch}
                onChange={e => { setGroupSearch(e.target.value); setShowGroupDropdown(true); }}
                onFocus={() => setShowGroupDropdown(true)}
                onBlur={() => setTimeout(() => setShowGroupDropdown(false), 200)}
              />
            </div>

            {showGroupDropdown && filteredGroups.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                {filteredGroups.slice(0, 10).map(g => (
                  <button
                    key={g._id}
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => addGroup(g)}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color || '#6366f1' }} />
                    <span className="flex-1 text-slate-800 dark:text-slate-200">{g.name}</span>
                    {g.type && <span className="text-xs text-slate-400">{g.type}</span>}
                    <Plus size={14} className="text-slate-400" />
                  </button>
                ))}
              </div>
            )}

            {showGroupDropdown && groupSearch && filteredGroups.length === 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-center text-sm text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                No groups found
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">Assign the student to one or more groups for exam access and communication</p>
        </section>

        {/* Subscription & Payment */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Subscription & Payment</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Assign Plan (Optional)</label>
              <select aria-label="Assign Plan" title="Assign Plan" className={inputCls} value={form.planId} onChange={e => set('planId', e.target.value)}>
                <option value="">No plan assignment</option>
                {Array.isArray(plans) && plans.map((p: AdminSubscriptionPlan) => (
                  <option key={p._id} value={p._id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <ModernToggle
                label="Record payment on creation"
                checked={Boolean(form.recordPayment)}
                onChange={v => set('recordPayment', v)}
                size="sm"
              />
            </div>
            {form.recordPayment && (
              <>
                <div>
                  <label className={labelCls}>Payment Amount (BDT)</label>
                  <input aria-label="Payment Amount" title="Payment Amount" className={inputCls} type="number" min="0" value={form.paymentAmount} onChange={e => set('paymentAmount', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Payment Method</label>
                  <select aria-label="Payment Method" title="Payment Method" className={inputCls} value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
                    <option value="">Select method</option>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Onboarding */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-200">Onboarding</h3>
          <ModernToggle
            label={<span className="flex items-center gap-2"><Send size={14} /> Send credentials via SMS after creation</span>}
            checked={Boolean(form.sendCredentials)}
            onChange={v => set('sendCredentials', v)}
            size="sm"
          />
        </section>

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => navigate(adminUi('student-management/list'))} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {mutation.isPending ? 'Creating...' : 'Create Student'}
          </button>
        </div>

        {mutation.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {(mutation.error as Error)?.message || 'Failed to create student'}
          </div>
        )}
      </form>
    </div>
  );
}
