'use client';

import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  assignStudentPlan,
  createAdminStudent,
  createExpense,
  createPayment,
  getPayments,
  getAdminPlans,
  getAdminStudents,
  getBackups,
  getDues,
  getExpenses,
  getFinanceSummary,
  getNotices,
  getRuntimeSettings,
  getStaffPayouts,
  getSupportTickets,
  replySupportTicket,
  restoreBackup,
  runBackup,
  sendDueReminder,
  updateDue,
  updateSupportTicketStatus,
} from '@/lib/api';
import { BackupRow, DueRow, ExpenseRow, FinanceSummary, NoticeRow, PaymentRow, PlanRow, RuntimeSettingsPayload, StaffPayoutRow, StudentRow, TicketRow } from '@/lib/types';

type TabId = 'students' | 'plans' | 'finance' | 'expenses' | 'payouts' | 'dues' | 'notices' | 'tickets' | 'backups';

const TAB_CONFIG: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'students', label: 'Students', icon: '👥' },
  { id: 'plans', label: 'Plans', icon: '📋' },
  { id: 'finance', label: 'Finance', icon: '💰' },
  { id: 'expenses', label: 'Expenses', icon: '📊' },
  { id: 'payouts', label: 'Payouts', icon: '💳' },
  { id: 'dues', label: 'Dues', icon: '⚠️' },
  { id: 'notices', label: 'Notices', icon: '📢' },
  { id: 'tickets', label: 'Tickets', icon: '🎫' },
  { id: 'backups', label: 'Backups', icon: '💾' },
];

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(value: number): string {
  return `৳${value.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export default function AdminConsole() {
  const [token, setToken] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('finance');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [payouts, setPayouts] = useState<StaffPayoutRow[]>([]);
  const [dues, setDues] = useState<DueRow[]>([]);
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsPayload | null>(null);

  // Form states
  const [quickStudentId, setQuickStudentId] = useState('');
  const [quickPaymentAmount, setQuickPaymentAmount] = useState('0');
  const [quickExpenseAmount, setQuickExpenseAmount] = useState('0');
  const [quickExpenseCategory, setQuickExpenseCategory] = useState<'server' | 'marketing' | 'staff_salary' | 'moderator_salary' | 'tools' | 'misc'>('tools');
  const [createStudentName, setCreateStudentName] = useState('');
  const [createStudentUsername, setCreateStudentUsername] = useState('');
  const [createStudentEmail, setCreateStudentEmail] = useState('');
  const [createStudentPassword, setCreateStudentPassword] = useState('');
  const [createStudentPlanCode, setCreateStudentPlanCode] = useState('');
  const [assignPlanStudentId, setAssignPlanStudentId] = useState('');
  const [assignPlanCode, setAssignPlanCode] = useState('');
  const [assignPlanDays, setAssignPlanDays] = useState('30');
  const [dueStudentId, setDueStudentId] = useState('');
  const [dueComputed, setDueComputed] = useState('0');
  const [dueAdjustment, setDueAdjustment] = useState('0');
  const [dueWaiver, setDueWaiver] = useState('0');
  const [dueNote, setDueNote] = useState('');
  const [reminderStudentId, setReminderStudentId] = useState('');
  const [ticketActionId, setTicketActionId] = useState('');
  const [ticketStatus, setTicketStatus] = useState<'open' | 'in_progress' | 'resolved' | 'closed'>('in_progress');
  const [ticketReply, setTicketReply] = useState('');
  const [restoreBackupId, setRestoreBackupId] = useState('');
  const [restoreConfirmation, setRestoreConfirmation] = useState('');
  const [uiMessage, setUiMessage] = useState('');

  useEffect(() => {
    const stored = window.localStorage.getItem('campusway-token') || '';
    setToken(stored);
  }, []);

  const kpis = useMemo(() => ([
    { label: 'Total Income', value: finance ? formatCurrency(finance.totalIncome) : '—', accent: 'green' },
    { label: 'Total Expense', value: finance ? formatCurrency(finance.totalExpenses) : '—', accent: 'red' },
    { label: 'Net Profit', value: finance ? formatCurrency(finance.netProfit) : '—', accent: 'blue' },
    { label: 'Due Students', value: `${dues.length}`, accent: 'amber' },
    { label: 'Active Plans', value: `${plans.filter(p => p.isActive).length}`, accent: 'violet' },
  ]), [finance, dues.length, plans]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    const applySafely = <T,>(fn: () => Promise<T>) =>
      fn().catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load data.');
        return null;
      });

    (async () => {
      await Promise.all([
        applySafely(async () => { const res = await getAdminStudents(token); if (!cancelled) setStudents(res.items || []); }),
        applySafely(async () => { const res = await getAdminPlans(token); if (!cancelled) setPlans(res.items || []); }),
        applySafely(async () => { const res = await getFinanceSummary(token); if (!cancelled) setFinance(res); }),
        applySafely(async () => { const res = await getPayments(token); if (!cancelled) setPayments(res.items || []); }),
        applySafely(async () => { const res = await getExpenses(token); if (!cancelled) setExpenses(res.items || []); }),
        applySafely(async () => { const res = await getStaffPayouts(token); if (!cancelled) setPayouts(res.items || []); }),
        applySafely(async () => { const res = await getDues(token); if (!cancelled) setDues(res.items || []); }),
        applySafely(async () => { const res = await getNotices(token); if (!cancelled) setNotices(res.items || []); }),
        applySafely(async () => { const res = await getSupportTickets(token); if (!cancelled) setTickets(res.items || []); }),
        applySafely(async () => { const res = await getBackups(token); if (!cancelled) setBackups(res.items || []); }),
        applySafely(async () => { const res = await getRuntimeSettings(token); if (!cancelled) setRuntimeSettings(res); }),
      ]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function refreshData() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [studentsRes, plansRes, financeRes, paymentsRes, expensesRes, payoutsRes, duesRes, noticesRes, ticketsRes, backupsRes, runtimeRes] = await Promise.all([
        getAdminStudents(token), getAdminPlans(token), getFinanceSummary(token), getPayments(token),
        getExpenses(token), getStaffPayouts(token), getDues(token), getNotices(token),
        getSupportTickets(token), getBackups(token), getRuntimeSettings(token),
      ]);
      setStudents(studentsRes.items || []); setPlans(plansRes.items || []); setFinance(financeRes);
      setPayments(paymentsRes.items || []); setExpenses(expensesRes.items || []);
      setPayouts(payoutsRes.items || []); setDues(duesRes.items || []);
      setNotices(noticesRes.items || []); setTickets(ticketsRes.items || []);
      setBackups(backupsRes.items || []); setRuntimeSettings(runtimeRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh.');
    } finally { setLoading(false); }
  }

  async function handleRunBackup() {
    if (!token) return;
    setLoading(true); setError(''); setUiMessage('');
    try {
      await runBackup(token, 'incremental', 'local');
      setUiMessage('Incremental backup completed successfully.');
      await refreshData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Backup failed.'); }
    finally { setLoading(false); }
  }

  async function handleQuickPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickStudentId.trim()) { setError('Student ID required.'); return; }
    setLoading(true); setError('');
    try {
      await createPayment(token, { studentId: quickStudentId.trim(), amount: Number(quickPaymentAmount || 0), method: 'manual', entryType: 'other_income' });
      setUiMessage('Payment recorded.'); await refreshData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Payment failed.'); }
    finally { setLoading(false); }
  }

  async function handleQuickExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      await createExpense(token, { category: quickExpenseCategory, amount: Number(quickExpenseAmount || 0), vendor: 'Next Hybrid Console' });
      setUiMessage('Expense recorded.'); await refreshData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Expense failed.'); }
    finally { setLoading(false); }
  }

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createStudentName.trim() || !createStudentUsername.trim() || !createStudentEmail.trim()) { setError('Name, username, and email required.'); return; }
    setLoading(true); setError(''); setUiMessage('');
    try {
      const res = await createAdminStudent(token, {
        fullName: createStudentName.trim(), username: createStudentUsername.trim(), email: createStudentEmail.trim(),
        ...(createStudentPassword.trim() ? { password: createStudentPassword.trim() } : {}),
        ...(createStudentPlanCode.trim() ? { planCode: createStudentPlanCode.trim() } : {}),
      });
      setUiMessage(res.inviteSent ? 'Student created & setup link sent.' : 'Student created.');
      setCreateStudentName(''); setCreateStudentUsername(''); setCreateStudentEmail(''); setCreateStudentPassword('');
      await refreshData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Create failed.'); }
    finally { setLoading(false); }
  }

  async function handleAssignPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignPlanStudentId.trim() || !assignPlanCode.trim()) { setError('Student ID and plan code required.'); return; }
    const days = Math.max(1, Number(assignPlanDays || 30));
    const startDate = new Date();
    const expiryDate = new Date(startDate.getTime() + days * 86400000);
    setLoading(true); setError(''); setUiMessage('');
    try {
      await assignStudentPlan(token, assignPlanStudentId.trim(), { planCode: assignPlanCode.trim(), isActive: true, startDate: startDate.toISOString(), expiryDate: expiryDate.toISOString() });
      setUiMessage('Plan assigned.'); await refreshData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Assign failed.'); }
    finally { setLoading(false); }
  }

  async function handleUpdateDue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dueStudentId.trim()) { setError('Student ID required.'); return; }
    setLoading(true); setError(''); setUiMessage('');
    try {
      await updateDue(token, dueStudentId.trim(), { computedDue: Number(dueComputed || 0), manualAdjustment: Number(dueAdjustment || 0), waiverAmount: Number(dueWaiver || 0), note: dueNote.trim() });
      setUiMessage('Due updated.'); await refreshData();
    } catch (err) { setError(err instanceof Error ? err.message : 'Due update failed.'); }
    finally { setLoading(false); }
  }

  async function handleSendReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reminderStudentId.trim()) { setError('Student ID required.'); return; }
    setLoading(true); setError(''); setUiMessage('');
    try { await sendDueReminder(token, reminderStudentId.trim()); setUiMessage('Reminder sent.'); await refreshData(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Reminder failed.'); }
    finally { setLoading(false); }
  }

  async function handleTicketStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticketActionId.trim()) { setError('Ticket ID required.'); return; }
    setLoading(true); setError(''); setUiMessage('');
    try { await updateSupportTicketStatus(token, ticketActionId.trim(), ticketStatus); setUiMessage('Status updated.'); await refreshData(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Status update failed.'); }
    finally { setLoading(false); }
  }

  async function handleTicketReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticketActionId.trim() || !ticketReply.trim()) { setError('Ticket ID and reply required.'); return; }
    setLoading(true); setError(''); setUiMessage('');
    try { await replySupportTicket(token, ticketActionId.trim(), ticketReply.trim()); setUiMessage('Reply sent.'); setTicketReply(''); await refreshData(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Reply failed.'); }
    finally { setLoading(false); }
  }

  async function handleRestoreBackup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restoreBackupId.trim()) { setError('Backup ID required.'); return; }
    if (!restoreConfirmation.trim()) { setError(`Type: RESTORE ${restoreBackupId.trim()}`); return; }
    setLoading(true); setError(''); setUiMessage('');
    try { await restoreBackup(token, restoreBackupId.trim(), restoreConfirmation.trim()); setUiMessage('Restore completed.'); setRestoreConfirmation(''); await refreshData(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Restore failed.'); }
    finally { setLoading(false); }
  }

  if (!token) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card-elevated" style={{ maxWidth: 420, textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔐</div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem' }}>Admin Authentication Required</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Login via the legacy app first, then reload this page.
          </p>
          <p style={{ margin: '0.8rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Token key: <code style={{ background: 'rgba(52,120,246,0.12)', padding: '0.15rem 0.4rem', borderRadius: 6 }}>campusway-token</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Header ── */}
      <header className="card-elevated" style={{ padding: '1.5rem 1.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              CampusWay Admin
            </h1>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Subscriptions, finance, support & system management
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="pill" style={runtimeSettings?.featureFlags?.nextAdminEnabled ? { borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#34d399' } : {}}>
              <span className={`status-dot ${runtimeSettings?.featureFlags?.nextAdminEnabled ? 'status-dot-active' : 'status-dot-expired'}`} />
              Next Admin
            </span>
            <button className="btn" onClick={refreshData} disabled={loading} style={{ padding: '0.5rem 0.85rem' }}>
              {loading ? '⟳ Syncing...' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid" style={{ marginTop: '1.2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.7rem' }}>
          {kpis.map((item) => (
            <div className="kpi-card" key={item.label} data-accent={item.accent}>
              <p className="kpi-label">{item.label}</p>
              <p className="kpi-value">{item.value}</p>
            </div>
          ))}
        </div>
      </header>

      {/* ── Quick Actions ── */}
      <div className="grid grid-2">
        <div className="card" style={{ padding: '1.2rem' }}>
          <p className="section-title">💳 Quick Payment</p>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }} onSubmit={handleQuickPayment}>
            <input className="input" value={quickStudentId} onChange={(e) => setQuickStudentId(e.target.value)} placeholder="Student ObjectId" />
            <input className="input" value={quickPaymentAmount} onChange={(e) => setQuickPaymentAmount(e.target.value)} placeholder="Amount" type="number" min={0} step="0.01" />
            <button className="btn" type="submit" disabled={loading}>Record Payment</button>
          </form>
        </div>
        <div className="card" style={{ padding: '1.2rem' }}>
          <p className="section-title">📊 Quick Expense</p>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }} onSubmit={handleQuickExpense}>
            <select className="input" value={quickExpenseCategory} onChange={(e) => setQuickExpenseCategory(e.target.value as typeof quickExpenseCategory)}>
              <option value="server">Server</option>
              <option value="marketing">Marketing</option>
              <option value="staff_salary">Staff Salary</option>
              <option value="moderator_salary">Moderator Salary</option>
              <option value="tools">Tools</option>
              <option value="misc">Misc</option>
            </select>
            <input className="input" value={quickExpenseAmount} onChange={(e) => setQuickExpenseAmount(e.target.value)} placeholder="Amount" type="number" min={0} step="0.01" />
            <button className="btn" type="submit" disabled={loading}>Record Expense</button>
          </form>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <nav className="tab-nav">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${tab.id === activeTab ? 'tab-btn-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Alerts ── */}
      {error && <div className="alert alert-error">⚠ {error}</div>}
      {uiMessage && <div className="alert alert-success">✓ {uiMessage}</div>}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⟳</div>
          Loading data...
        </div>
      )}

      {/* ── Students Tab ── */}
      {!loading && activeTab === 'students' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="grid grid-2">
            <div className="card" style={{ padding: '1.2rem' }}>
              <p className="section-title">➕ Create Student</p>
              <form style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} onSubmit={handleCreateStudent}>
                <input className="input" value={createStudentName} onChange={(e) => setCreateStudentName(e.target.value)} placeholder="Full name" />
                <input className="input" value={createStudentUsername} onChange={(e) => setCreateStudentUsername(e.target.value)} placeholder="Username" />
                <input className="input" value={createStudentEmail} onChange={(e) => setCreateStudentEmail(e.target.value)} placeholder="Email" />
                <input className="input" value={createStudentPassword} onChange={(e) => setCreateStudentPassword(e.target.value)} placeholder="Password (optional)" />
                <select className="input" value={createStudentPlanCode} onChange={(e) => setCreateStudentPlanCode(e.target.value)}>
                  <option value="">Plan (optional)</option>
                  {plans.map((p) => <option key={p._id} value={p.code}>{p.code}</option>)}
                </select>
                <button className="btn" type="submit" disabled={loading}>Create Student</button>
              </form>
            </div>
            <div className="card" style={{ padding: '1.2rem' }}>
              <p className="section-title">🔗 Assign Plan</p>
              <form style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} onSubmit={handleAssignPlan}>
                <input className="input" value={assignPlanStudentId} onChange={(e) => setAssignPlanStudentId(e.target.value)} placeholder="Student ObjectId" />
                <select className="input" value={assignPlanCode} onChange={(e) => setAssignPlanCode(e.target.value)}>
                  <option value="">Select plan</option>
                  {plans.map((p) => <option key={p._id} value={p.code}>{p.code} — {p.name}</option>)}
                </select>
                <input className="input" value={assignPlanDays} onChange={(e) => setAssignPlanDays(e.target.value)} placeholder="Duration (days)" type="number" min={1} />
                <button className="btn" type="submit" disabled={loading}>Assign Plan</button>
              </form>
            </div>
          </div>

          <div className="card-elevated" style={{ padding: '1.3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p className="section-title" style={{ margin: 0 }}>Student Directory</p>
              <span className="pill">{students.length} total</span>
            </div>
            <div className="grid" style={{ gap: '0.6rem' }}>
              {students.slice(0, 20).map((row) => (
                <div key={row._id} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
                  background: 'rgba(8, 18, 44, 0.4)', transition: 'background 0.15s',
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(52,120,246,0.2), rgba(139,92,246,0.2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0,
                  }}>
                    {(row.fullName || row.full_name || row.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                        {row.fullName || row.full_name || row.username || 'Unnamed'}
                      </span>
                      {row.subscription?.isActive ? (
                        <span className="pill pill-success" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                          <span className="status-dot status-dot-active" /> Active
                        </span>
                      ) : row.subscription?.planCode ? (
                        <span className="pill pill-danger" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
                          <span className="status-dot status-dot-expired" /> Expired
                        </span>
                      ) : null}
                    </div>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {row.email || 'No email'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', justifyContent: 'flex-end' }}>
                    <span className="pill">{row.subscription?.planName || row.subscription?.planCode || 'No plan'}</span>
                    {row.subscription?.daysLeft !== undefined && row.subscription.daysLeft > 0 ? (
                      <span className="pill pill-warning" style={{ fontSize: '0.7rem' }}>{row.subscription.daysLeft}d left</span>
                    ) : null}
                    {row.batch ? <span className="pill" style={{ fontSize: '0.7rem' }}>{row.batch}</span> : null}
                    {row.department ? <span className="pill pill-violet" style={{ fontSize: '0.7rem' }}>{row.department}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Plans Tab ── */}
      {!loading && activeTab === 'plans' && (
        <div className="card-elevated" style={{ padding: '1.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <p className="section-title" style={{ margin: 0 }}>Subscription Plans</p>
            <span className="pill">{plans.length} plans</span>
          </div>
          <div className="grid grid-2" style={{ gap: '0.7rem' }}>
            {plans.map((plan) => (
              <div key={plan._id} style={{
                padding: '1.1rem 1.2rem', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)', background: 'rgba(8, 18, 44, 0.5)',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: plan.isActive ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #6b82a8, #4a5e80)',
                }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{plan.name}</h4>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {plan.code}
                    </p>
                  </div>
                  <span className={plan.isActive ? 'pill pill-success' : 'pill'} style={{ fontSize: '0.7rem' }}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.8rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Price</p>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '1.15rem', fontWeight: 700 }}>{formatCurrency(plan.price ?? 0)}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Duration</p>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '1.15rem', fontWeight: 700 }}>
                      {plan.durationValue || plan.durationDays} <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{plan.durationUnit || 'days'}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Finance Tab ── */}
      {!loading && activeTab === 'finance' && finance && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="grid grid-4">
            {[
              { label: 'Total Income', value: formatCurrency(finance.totalIncome), accent: 'green' },
              { label: 'Total Expenses', value: formatCurrency(finance.totalExpenses), accent: 'red' },
              { label: 'Direct Expenses', value: formatCurrency(finance.directExpenses), accent: 'amber' },
              { label: 'Salary Payouts', value: formatCurrency(finance.salaryPayouts), accent: 'violet' },
            ].map((item) => (
              <div className="kpi-card" key={item.label} data-accent={item.accent}>
                <p className="kpi-label">{item.label}</p>
                <p className="kpi-value" style={{ fontSize: '1.3rem' }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="card-elevated" style={{ padding: '1.3rem' }}>
            <p className="section-title">Recent Payments</p>
            <div className="grid" style={{ gap: '0.5rem' }}>
              {payments.slice(0, 8).map((row) => (
                <div key={row._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)', background: 'rgba(8, 18, 44, 0.35)',
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      {row.studentId?.full_name || row.studentId?.username || row.studentId?.email || 'Student'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                      <span className="pill" style={{ fontSize: '0.68rem' }}>{row.method}</span>
                      <span className="pill" style={{ fontSize: '0.68rem' }}>{row.entryType.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#34d399' }}>{formatCurrency(row.amount)}</p>
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatDate(row.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Expenses Tab ── */}
      {!loading && activeTab === 'expenses' && (
        <div className="card-elevated" style={{ padding: '1.3rem' }}>
          <p className="section-title">Expense Ledger</p>
          <div className="grid" style={{ gap: '0.5rem' }}>
            {expenses.map((row) => (
              <div key={row._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)', background: 'rgba(8, 18, 44, 0.35)',
              }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', textTransform: 'capitalize' }}>{row.category.replace('_', ' ')}</span>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {row.vendor || 'No vendor'} · {formatDate(row.date)}
                  </p>
                </div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#f87171' }}>{formatCurrency(row.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Payouts Tab ── */}
      {!loading && activeTab === 'payouts' && (
        <div className="card-elevated" style={{ padding: '1.3rem' }}>
          <p className="section-title">Staff Payouts</p>
          <div className="grid" style={{ gap: '0.5rem' }}>
            {payouts.map((row) => (
              <div key={row._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)', background: 'rgba(8, 18, 44, 0.35)',
              }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem', textTransform: 'capitalize' }}>{row.role}</span>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Period: {row.periodMonth} · Paid: {formatDate(row.paidAt)}
                  </p>
                </div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#a78bfa' }}>{formatCurrency(row.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Dues Tab ── */}
      {!loading && activeTab === 'dues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="grid grid-2">
            <div className="card" style={{ padding: '1.2rem' }}>
              <p className="section-title">📝 Update Due Ledger</p>
              <form style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} onSubmit={handleUpdateDue}>
                <input className="input" value={dueStudentId} onChange={(e) => setDueStudentId(e.target.value)} placeholder="Student ObjectId" />
                <input className="input" value={dueComputed} onChange={(e) => setDueComputed(e.target.value)} type="number" step="0.01" placeholder="Computed due" />
                <input className="input" value={dueAdjustment} onChange={(e) => setDueAdjustment(e.target.value)} type="number" step="0.01" placeholder="Manual adjustment" />
                <input className="input" value={dueWaiver} onChange={(e) => setDueWaiver(e.target.value)} type="number" step="0.01" placeholder="Waiver amount" />
                <input className="input" value={dueNote} onChange={(e) => setDueNote(e.target.value)} placeholder="Note (optional)" />
                <button className="btn" type="submit" disabled={loading}>Update Due</button>
              </form>
            </div>
            <div className="card" style={{ padding: '1.2rem' }}>
              <p className="section-title">🔔 Send Reminder</p>
              <form style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} onSubmit={handleSendReminder}>
                <input className="input" value={reminderStudentId} onChange={(e) => setReminderStudentId(e.target.value)} placeholder="Student ObjectId" />
                <button className="btn" type="submit" disabled={loading}>Send Reminder</button>
              </form>
            </div>
          </div>

          <div className="card-elevated" style={{ padding: '1.3rem' }}>
            <p className="section-title">Due Records</p>
            <div className="grid" style={{ gap: '0.5rem' }}>
              {dues.map((row) => (
                <div key={row._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)', background: 'rgba(8, 18, 44, 0.35)',
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      {row.studentId?.username || row.studentId?.email || 'Student'}
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      <span className="pill" style={{ fontSize: '0.68rem' }}>Computed: {formatCurrency(row.computedDue)}</span>
                      <span className="pill" style={{ fontSize: '0.68rem' }}>Adj: {formatCurrency(row.manualAdjustment)}</span>
                      <span className="pill" style={{ fontSize: '0.68rem' }}>Waiver: {formatCurrency(row.waiverAmount)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '1.05rem', color: row.netDue > 0 ? '#fbbf24' : '#34d399' }}>
                      {formatCurrency(row.netDue)}
                    </p>
                    {row.studentId?._id && (
                      <button className="btn-ghost btn-sm" type="button" onClick={() => { setReminderStudentId(row.studentId?._id || ''); setDueStudentId(row.studentId?._id || ''); }}>
                        Use ID
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Notices Tab ── */}
      {!loading && activeTab === 'notices' && (
        <div className="card-elevated" style={{ padding: '1.3rem' }}>
          <p className="section-title">Notices</p>
          <div className="grid" style={{ gap: '0.6rem' }}>
            {notices.map((row) => (
              <div key={row._id} style={{
                padding: '0.9rem 1rem', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)', background: 'rgba(8, 18, 44, 0.4)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{row.title}</h4>
                  <span className={row.isActive ? 'pill pill-success' : 'pill'} style={{ fontSize: '0.68rem' }}>
                    {row.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{row.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tickets Tab ── */}
      {!loading && activeTab === 'tickets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="grid grid-2">
            <div className="card" style={{ padding: '1.2rem' }}>
              <p className="section-title">🔄 Update Status</p>
              <form style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} onSubmit={handleTicketStatus}>
                <input className="input" value={ticketActionId} onChange={(e) => setTicketActionId(e.target.value)} placeholder="Ticket ObjectId" />
                <select className="input" value={ticketStatus} onChange={(e) => setTicketStatus(e.target.value as typeof ticketStatus)}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <button className="btn" type="submit" disabled={loading}>Update Status</button>
              </form>
            </div>
            <div className="card" style={{ padding: '1.2rem' }}>
              <p className="section-title">💬 Reply</p>
              <form style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} onSubmit={handleTicketReply}>
                <input className="input" value={ticketActionId} onChange={(e) => setTicketActionId(e.target.value)} placeholder="Ticket ObjectId" />
                <textarea className="input" value={ticketReply} onChange={(e) => setTicketReply(e.target.value)} placeholder="Reply message" rows={3} />
                <button className="btn" type="submit" disabled={loading}>Send Reply</button>
              </form>
            </div>
          </div>

          <div className="card-elevated" style={{ padding: '1.3rem' }}>
            <p className="section-title">Ticket Queue</p>
            <div className="grid" style={{ gap: '0.5rem' }}>
              {tickets.map((row) => {
                const statusColors: Record<string, string> = { open: 'pill-warning', in_progress: 'pill-violet', resolved: 'pill-success', closed: 'pill' };
                const priorityColors: Record<string, string> = { high: 'pill-danger', medium: 'pill-warning', low: 'pill' };
                return (
                  <div key={row._id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)', background: 'rgba(8, 18, 44, 0.35)',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{row.ticketNo}</span>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{row.subject}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                        <span className={`pill ${statusColors[row.status] || 'pill'}`} style={{ fontSize: '0.68rem' }}>{row.status.replace('_', ' ')}</span>
                        <span className={`pill ${priorityColors[row.priority] || 'pill'}`} style={{ fontSize: '0.68rem' }}>{row.priority}</span>
                      </div>
                    </div>
                    <button className="btn-ghost btn-sm" type="button" onClick={() => setTicketActionId(row._id)}>Use ID</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Backups Tab ── */}
      {!loading && activeTab === 'backups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div className="card" style={{ padding: '1.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
              <p className="section-title" style={{ margin: 0 }}>🛡️ Backup Management</p>
              <button className="btn" onClick={handleRunBackup} disabled={loading}>Run Incremental Backup</button>
            </div>
            <form style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} onSubmit={handleRestoreBackup}>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>⚠ Restore is destructive. Requires confirmation.</p>
              <input className="input" value={restoreBackupId} onChange={(e) => setRestoreBackupId(e.target.value)} placeholder="Backup ObjectId" />
              <input className="input" value={restoreConfirmation} onChange={(e) => setRestoreConfirmation(e.target.value)} placeholder={`Type: RESTORE ${restoreBackupId || '<backupId>'}`} />
              <button className="btn" type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>Restore Backup</button>
            </form>
          </div>

          <div className="card-elevated" style={{ padding: '1.3rem' }}>
            <p className="section-title">Backup History</p>
            <div className="grid" style={{ gap: '0.5rem' }}>
              {backups.map((row) => {
                const statusMap: Record<string, string> = { completed: 'pill-success', running: 'pill-warning', pending: 'pill', failed: 'pill-danger' };
                return (
                  <div key={row._id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)', background: 'rgba(8, 18, 44, 0.35)',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', textTransform: 'uppercase' }}>{row.type}</span>
                        <span className="pill" style={{ fontSize: '0.68rem' }}>{row.storage}</span>
                        <span className={`pill ${statusMap[row.status] || 'pill'}`} style={{ fontSize: '0.68rem' }}>{row.status}</span>
                      </div>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatDate(row.createdAt)} · {row.localPath || row.s3Key || 'Path pending'}
                      </p>
                    </div>
                    <button className="btn-ghost btn-sm" type="button" onClick={() => { setRestoreBackupId(row._id); setRestoreConfirmation(`RESTORE ${row._id}`); }}>
                      Prepare Restore
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
