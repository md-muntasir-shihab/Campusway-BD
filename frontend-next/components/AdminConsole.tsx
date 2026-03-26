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

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'students', label: 'Students' },
  { id: 'plans', label: 'Subscription Plans' },
  { id: 'finance', label: 'Accounts & Finance' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'payouts', label: 'Staff Payouts' },
  { id: 'dues', label: 'Dues & Alerts' },
  { id: 'notices', label: 'Notices' },
  { id: 'tickets', label: 'Support Tickets' },
  { id: 'backups', label: 'Backups' },
];

function formatDate(value?: string | null): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
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
    { label: 'Income', value: finance ? `${finance.totalIncome.toFixed(2)}` : '-' },
    { label: 'Expense', value: finance ? `${finance.totalExpenses.toFixed(2)}` : '-' },
    { label: 'Net', value: finance ? `${finance.netProfit.toFixed(2)}` : '-' },
    { label: 'Due Students', value: `${dues.length}` },
  ]), [finance, dues.length]);

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
        applySafely(async () => {
          const res = await getAdminStudents(token);
          if (!cancelled) setStudents(res.items || []);
        }),
        applySafely(async () => {
          const res = await getAdminPlans(token);
          if (!cancelled) setPlans(res.items || []);
        }),
        applySafely(async () => {
          const res = await getFinanceSummary(token);
          if (!cancelled) setFinance(res);
        }),
        applySafely(async () => {
          const res = await getPayments(token);
          if (!cancelled) setPayments(res.items || []);
        }),
        applySafely(async () => {
          const res = await getExpenses(token);
          if (!cancelled) setExpenses(res.items || []);
        }),
        applySafely(async () => {
          const res = await getStaffPayouts(token);
          if (!cancelled) setPayouts(res.items || []);
        }),
        applySafely(async () => {
          const res = await getDues(token);
          if (!cancelled) setDues(res.items || []);
        }),
        applySafely(async () => {
          const res = await getNotices(token);
          if (!cancelled) setNotices(res.items || []);
        }),
        applySafely(async () => {
          const res = await getSupportTickets(token);
          if (!cancelled) setTickets(res.items || []);
        }),
        applySafely(async () => {
          const res = await getBackups(token);
          if (!cancelled) setBackups(res.items || []);
        }),
        applySafely(async () => {
          const res = await getRuntimeSettings(token);
          if (!cancelled) setRuntimeSettings(res);
        }),
      ]);

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function refreshData() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [studentsRes, plansRes, financeRes, paymentsRes, expensesRes, payoutsRes, duesRes, noticesRes, ticketsRes, backupsRes, runtimeRes] = await Promise.all([
        getAdminStudents(token),
        getAdminPlans(token),
        getFinanceSummary(token),
        getPayments(token),
        getExpenses(token),
        getStaffPayouts(token),
        getDues(token),
        getNotices(token),
        getSupportTickets(token),
        getBackups(token),
        getRuntimeSettings(token),
      ]);
      setStudents(studentsRes.items || []);
      setPlans(plansRes.items || []);
      setFinance(financeRes);
      setPayments(paymentsRes.items || []);
      setExpenses(expensesRes.items || []);
      setPayouts(payoutsRes.items || []);
      setDues(duesRes.items || []);
      setNotices(noticesRes.items || []);
      setTickets(ticketsRes.items || []);
      setBackups(backupsRes.items || []);
      setRuntimeSettings(runtimeRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRunBackup() {
    if (!token) return;
    setLoading(true);
    setError('');
    setUiMessage('');
    try {
      await runBackup(token, 'incremental', 'local');
      setUiMessage('Incremental backup started/completed successfully.');
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run backup.');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quickStudentId.trim()) {
      setError('Student ID is required for payment entry.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createPayment(token, {
        studentId: quickStudentId.trim(),
        amount: Number(quickPaymentAmount || 0),
        method: 'manual',
        entryType: 'other_income',
      });
      setUiMessage('Manual payment recorded successfully.');
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment create failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createExpense(token, {
        category: quickExpenseCategory,
        amount: Number(quickExpenseAmount || 0),
        vendor: 'Next Hybrid Console',
      });
      setUiMessage('Expense entry recorded successfully.');
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Expense create failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createStudentName.trim() || !createStudentUsername.trim() || !createStudentEmail.trim()) {
      setError('Name, username, and email are required.');
      return;
    }

    setLoading(true);
    setError('');
    setUiMessage('');
    try {
      const res = await createAdminStudent(token, {
        fullName: createStudentName.trim(),
        username: createStudentUsername.trim(),
        email: createStudentEmail.trim(),
        ...(createStudentPassword.trim() ? { password: createStudentPassword.trim() } : {}),
        ...(createStudentPlanCode.trim() ? { planCode: createStudentPlanCode.trim() } : {}),
      });
      setUiMessage(
        res.inviteSent
          ? 'Student created and setup link sent successfully.'
          : 'Student created successfully.',
      );
      setCreateStudentName('');
      setCreateStudentUsername('');
      setCreateStudentEmail('');
      setCreateStudentPassword('');
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Student create failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignPlanStudentId.trim() || !assignPlanCode.trim()) {
      setError('Student ID and plan code are required.');
      return;
    }

    const days = Math.max(1, Number(assignPlanDays || 30));
    const startDate = new Date();
    const expiryDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

    setLoading(true);
    setError('');
    setUiMessage('');
    try {
      await assignStudentPlan(token, assignPlanStudentId.trim(), {
        planCode: assignPlanCode.trim(),
        isActive: true,
        startDate: startDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
      });
      setUiMessage('Student plan assigned successfully.');
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Plan assign failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateDue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dueStudentId.trim()) {
      setError('Student ID is required to update due.');
      return;
    }
    setLoading(true);
    setError('');
    setUiMessage('');
    try {
      await updateDue(token, dueStudentId.trim(), {
        computedDue: Number(dueComputed || 0),
        manualAdjustment: Number(dueAdjustment || 0),
        waiverAmount: Number(dueWaiver || 0),
        note: dueNote.trim(),
      });
      setUiMessage('Due ledger updated successfully.');
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Due update failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reminderStudentId.trim()) {
      setError('Student ID is required for reminder.');
      return;
    }
    setLoading(true);
    setError('');
    setUiMessage('');
    try {
      await sendDueReminder(token, reminderStudentId.trim());
      setUiMessage('Due reminder dispatched successfully.');
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Due reminder failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTicketStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticketActionId.trim()) {
      setError('Ticket ID is required.');
      return;
    }
    setLoading(true);
    setError('');
    setUiMessage('');
    try {
      await updateSupportTicketStatus(token, ticketActionId.trim(), ticketStatus);
      setUiMessage('Ticket status updated successfully.');
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ticket status update failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTicketReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticketActionId.trim() || !ticketReply.trim()) {
      setError('Ticket ID and reply message are required.');
      return;
    }
    setLoading(true);
    setError('');
    setUiMessage('');
    try {
      await replySupportTicket(token, ticketActionId.trim(), ticketReply.trim());
      setUiMessage('Ticket reply submitted successfully.');
      setTicketReply('');
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ticket reply failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestoreBackup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restoreBackupId.trim()) {
      setError('Backup job ID is required for restore.');
      return;
    }
    if (!restoreConfirmation.trim()) {
      setError(`Confirmation is required: RESTORE ${restoreBackupId.trim()}`);
      return;
    }
    setLoading(true);
    setError('');
    setUiMessage('');
    try {
      await restoreBackup(token, restoreBackupId.trim(), restoreConfirmation.trim());
      setUiMessage('Backup restore completed successfully.');
      setRestoreConfirmation('');
      await refreshData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup restore failed.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Admin Token Required</h2>
        <p>Login via legacy app first, then reload this page.</p>
        <p style={{ opacity: 0.8 }}>Expected token key: <code>campusway-token</code></p>
      </section>
    );
  }

  return (
    <section className="grid" style={{ gap: '1rem' }}>
      <div className="card">
        <h1 style={{ marginTop: 0, marginBottom: '0.4rem' }}>Admin Dashboard (Next Hybrid)</h1>
        <p style={{ marginTop: 0, opacity: 0.85 }}>Manual subscriptions/payments, finance analytics, support, and backups.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.8rem' }}>
          <span className="pill">nextAdminEnabled: {runtimeSettings?.featureFlags?.nextAdminEnabled ? 'true' : 'false'}</span>
          <span className="pill">financeDashboardV1: {runtimeSettings?.featureFlags?.financeDashboardV1 ? 'true' : 'false'}</span>
        </div>
        <div className="grid grid-3">
          {kpis.map((item) => (
            <article className="card" key={item.label}>
              <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.8 }}>{item.label}</p>
              <h2 style={{ margin: '0.35rem 0 0', fontSize: '1.25rem' }}>{item.value}</h2>
            </article>
          ))}
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Quick Manual Payment</h3>
          <form className="grid" onSubmit={handleQuickPayment}>
            <input
              value={quickStudentId}
              onChange={(event) => setQuickStudentId(event.target.value)}
              placeholder="Student ObjectId"
              style={inputStyle}
            />
            <input
              value={quickPaymentAmount}
              onChange={(event) => setQuickPaymentAmount(event.target.value)}
              placeholder="Amount"
              type="number"
              min={0}
              step="0.01"
              style={inputStyle}
            />
            <button className="btn" type="submit" disabled={loading}>Record Payment</button>
          </form>
        </section>
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Quick Expense Entry</h3>
          <form className="grid" onSubmit={handleQuickExpense}>
            <select value={quickExpenseCategory} onChange={(event) => setQuickExpenseCategory(event.target.value as typeof quickExpenseCategory)} style={inputStyle}>
              <option value="server">Server</option>
              <option value="marketing">Marketing</option>
              <option value="staff_salary">Staff Salary</option>
              <option value="moderator_salary">Moderator Salary</option>
              <option value="tools">Tools</option>
              <option value="misc">Misc</option>
            </select>
            <input
              value={quickExpenseAmount}
              onChange={(event) => setQuickExpenseAmount(event.target.value)}
              placeholder="Amount"
              type="number"
              min={0}
              step="0.01"
              style={inputStyle}
            />
            <button className="btn" type="submit" disabled={loading}>Record Expense</button>
          </form>
        </section>
      </div>

      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button className="btn" onClick={refreshData} disabled={loading}>Refresh</button>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className="btn"
            style={{
              background: tab.id === activeTab
                ? 'linear-gradient(120deg, #2e8ef7, #00b1d9)'
                : 'linear-gradient(120deg, rgba(58,95,165,.6), rgba(17,40,91,.6))',
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="card" style={{ borderColor: 'rgba(255,102,102,.5)' }}>{error}</div>}
      {uiMessage && <div className="card" style={{ borderColor: 'rgba(88,211,150,.45)' }}>{uiMessage}</div>}
      {loading && <div className="card">Loading...</div>}

      {!loading && activeTab === 'students' && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Students</h3>
          <p style={{ marginTop: 0, opacity: 0.8 }}>
            Password reveal is superadmin-only, requires MFA confirmation, and is fully audit logged.
          </p>
          <div className="grid grid-2" style={{ marginBottom: '0.9rem' }}>
            <form className="card grid" onSubmit={handleCreateStudent}>
              <strong>Create Student</strong>
              <input value={createStudentName} onChange={(event) => setCreateStudentName(event.target.value)} placeholder="Full name" style={inputStyle} />
              <input value={createStudentUsername} onChange={(event) => setCreateStudentUsername(event.target.value)} placeholder="Username" style={inputStyle} />
              <input value={createStudentEmail} onChange={(event) => setCreateStudentEmail(event.target.value)} placeholder="Email" style={inputStyle} />
              <input value={createStudentPassword} onChange={(event) => setCreateStudentPassword(event.target.value)} placeholder="Password (optional, leave blank to send setup link)" style={inputStyle} />
              <select value={createStudentPlanCode} onChange={(event) => setCreateStudentPlanCode(event.target.value)} style={inputStyle}>
                <option value="">Plan (optional)</option>
                {plans.map((plan) => (
                  <option key={plan._id} value={plan.code}>{plan.code}</option>
                ))}
              </select>
              <button className="btn" type="submit" disabled={loading}>Create Student</button>
            </form>
            <form className="card grid" onSubmit={handleAssignPlan}>
              <strong>Assign/Update Plan</strong>
              <input value={assignPlanStudentId} onChange={(event) => setAssignPlanStudentId(event.target.value)} placeholder="Student ObjectId" style={inputStyle} />
              <select value={assignPlanCode} onChange={(event) => setAssignPlanCode(event.target.value)} style={inputStyle}>
                <option value="">Select plan code</option>
                {plans.map((plan) => (
                  <option key={plan._id} value={plan.code}>{plan.code} ({plan.name})</option>
                ))}
              </select>
              <input
                value={assignPlanDays}
                onChange={(event) => setAssignPlanDays(event.target.value)}
                placeholder="Duration in days"
                type="number"
                min={1}
                style={inputStyle}
              />
              <button className="btn" type="submit" disabled={loading}>Assign Plan</button>
            </form>
          </div>
          <div className="grid">
            {students.slice(0, 20).map((row) => (
              <article key={row._id} className="card">
                <strong>{row.fullName || row.full_name || row.username || 'Unnamed student'}</strong>
                <p style={{ margin: '0.35rem 0', opacity: 0.82 }}>{row.email || 'No email'}</p>
                <span className="pill">{row.subscription?.planCode || 'No plan'}</span>
                <span className="pill" style={{ marginLeft: '0.5rem' }}>{row.status || 'active'}</span>
                <div style={{ marginTop: '0.55rem', display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                  <span className="pill">Days Left: {row.subscription?.daysLeft ?? 0}</span>
                  <span className="pill">Batch: {row.batch || 'N/A'}</span>
                  <span className="pill">Dept: {row.department || 'N/A'}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && activeTab === 'plans' && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Subscription Plans</h3>
          <div className="grid grid-2">
            {plans.map((plan) => (
              <article key={plan._id} className="card">
                <strong>{plan.name}</strong>
                <p style={{ margin: '0.4rem 0', opacity: 0.82 }}>{plan.code.toUpperCase()}</p>
                <p style={{ margin: 0 }}>Price: {plan.price ?? 0}</p>
                <p style={{ margin: '0.35rem 0 0' }}>
                  Duration: {plan.durationValue || plan.durationDays} {plan.durationUnit || 'days'}
                </p>
                <span className="pill" style={{ marginTop: '0.5rem' }}>{plan.isActive ? 'Active' : 'Inactive'}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && activeTab === 'finance' && finance && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Accounts & Finance Summary</h3>
          <div className="grid grid-2">
            <article className="card">
              <p>Total Income</p>
              <h2>{finance.totalIncome.toFixed(2)}</h2>
            </article>
            <article className="card">
              <p>Total Expenses</p>
              <h2>{finance.totalExpenses.toFixed(2)}</h2>
            </article>
            <article className="card">
              <p>Direct Expenses</p>
              <h2>{finance.directExpenses.toFixed(2)}</h2>
            </article>
            <article className="card">
              <p>Salary Payouts</p>
              <h2>{finance.salaryPayouts.toFixed(2)}</h2>
            </article>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem' }}>Recent Manual Payments</h4>
            <div className="grid">
              {payments.slice(0, 8).map((row) => (
                <article key={row._id} className="card">
                  <strong>
                    {row.studentId?.username || row.studentId?.email || 'Student'} - {row.amount}
                  </strong>
                  <p style={{ margin: '0.35rem 0', opacity: 0.84 }}>
                    Method: {row.method} | Type: {row.entryType}
                  </p>
                  <p style={{ margin: 0, opacity: 0.8 }}>Date: {formatDate(row.date)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {!loading && activeTab === 'expenses' && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Expense Ledger</h3>
          <div className="grid">
            {expenses.map((row) => (
              <article key={row._id} className="card">
                <strong>{row.category}</strong>
                <p style={{ margin: '0.35rem 0' }}>Amount: {row.amount}</p>
                <p style={{ margin: 0, opacity: 0.8 }}>Date: {formatDate(row.date)}</p>
                <p style={{ margin: '0.35rem 0 0', opacity: 0.8 }}>Vendor: {row.vendor || 'N/A'}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && activeTab === 'payouts' && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Staff Payouts</h3>
          <div className="grid">
            {payouts.map((row) => (
              <article key={row._id} className="card">
                <strong>{row.role}</strong>
                <p style={{ margin: '0.35rem 0' }}>Amount: {row.amount}</p>
                <p style={{ margin: 0, opacity: 0.8 }}>Period: {row.periodMonth}</p>
                <p style={{ margin: '0.35rem 0 0', opacity: 0.8 }}>Paid At: {formatDate(row.paidAt)}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && activeTab === 'dues' && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Dues & Alerts</h3>
          <div className="grid grid-2" style={{ marginBottom: '0.9rem' }}>
            <form className="card grid" onSubmit={handleUpdateDue}>
              <strong>Update Due Ledger</strong>
              <input value={dueStudentId} onChange={(event) => setDueStudentId(event.target.value)} placeholder="Student ObjectId" style={inputStyle} />
              <input value={dueComputed} onChange={(event) => setDueComputed(event.target.value)} type="number" step="0.01" placeholder="Computed due" style={inputStyle} />
              <input value={dueAdjustment} onChange={(event) => setDueAdjustment(event.target.value)} type="number" step="0.01" placeholder="Manual adjustment" style={inputStyle} />
              <input value={dueWaiver} onChange={(event) => setDueWaiver(event.target.value)} type="number" step="0.01" placeholder="Waiver amount" style={inputStyle} />
              <input value={dueNote} onChange={(event) => setDueNote(event.target.value)} placeholder="Note (optional)" style={inputStyle} />
              <button className="btn" type="submit" disabled={loading}>Update Due</button>
            </form>
            <form className="card grid" onSubmit={handleSendReminder}>
              <strong>Send Due Reminder</strong>
              <input value={reminderStudentId} onChange={(event) => setReminderStudentId(event.target.value)} placeholder="Student ObjectId" style={inputStyle} />
              <button className="btn" type="submit" disabled={loading}>Send Reminder</button>
            </form>
          </div>
          <div className="grid">
            {dues.map((row) => (
              <article key={row._id} className="card">
                <strong>{row.studentId?.username || row.studentId?.email || 'Student'}</strong>
                <p style={{ margin: '0.35rem 0' }}>Net Due: {row.netDue}</p>
                <p style={{ margin: 0, opacity: 0.8 }}>Computed: {row.computedDue}</p>
                <p style={{ margin: '0.35rem 0 0', opacity: 0.8 }}>
                  Adjustment: {row.manualAdjustment} | Waiver: {row.waiverAmount}
                </p>
                {row.studentId?._id && (
                  <div style={{ marginTop: '0.55rem' }}>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => {
                        setReminderStudentId(row.studentId?._id || '');
                        setDueStudentId(row.studentId?._id || '');
                      }}
                    >
                      Use This Student ID
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && activeTab === 'notices' && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Notices</h3>
          <div className="grid">
            {notices.map((row) => (
              <article key={row._id} className="card">
                <strong>{row.title}</strong>
                <p style={{ margin: '0.35rem 0' }}>{row.message}</p>
                <span className="pill">{row.isActive ? 'Active' : 'Inactive'}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && activeTab === 'tickets' && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Support Tickets</h3>
          <div className="grid grid-2" style={{ marginBottom: '0.9rem' }}>
            <form className="card grid" onSubmit={handleTicketStatus}>
              <strong>Update Ticket Status</strong>
              <input value={ticketActionId} onChange={(event) => setTicketActionId(event.target.value)} placeholder="Ticket ObjectId" style={inputStyle} />
              <select value={ticketStatus} onChange={(event) => setTicketStatus(event.target.value as typeof ticketStatus)} style={inputStyle}>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <button className="btn" type="submit" disabled={loading}>Update Status</button>
            </form>
            <form className="card grid" onSubmit={handleTicketReply}>
              <strong>Reply Ticket</strong>
              <input value={ticketActionId} onChange={(event) => setTicketActionId(event.target.value)} placeholder="Ticket ObjectId" style={inputStyle} />
              <textarea
                value={ticketReply}
                onChange={(event) => setTicketReply(event.target.value)}
                placeholder="Reply message"
                rows={3}
                style={inputStyle}
              />
              <button className="btn" type="submit" disabled={loading}>Send Reply</button>
            </form>
          </div>
          <div className="grid">
            {tickets.map((row) => (
              <article key={row._id} className="card">
                <strong>{row.ticketNo}</strong>
                <p style={{ margin: '0.35rem 0' }}>{row.subject}</p>
                <span className="pill">{row.status}</span>
                <span className="pill" style={{ marginLeft: '0.5rem' }}>{row.priority}</span>
                <div style={{ marginTop: '0.6rem' }}>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setTicketActionId(row._id)}
                  >
                    Use This Ticket ID
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!loading && activeTab === 'backups' && (
        <section className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.7rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Backups</h3>
            <button className="btn" onClick={handleRunBackup}>Run Incremental Backup</button>
          </div>
          <form className="card grid" style={{ marginTop: '0.8rem' }} onSubmit={handleRestoreBackup}>
            <strong>Restore Backup (Destructive)</strong>
            <input
              value={restoreBackupId}
              onChange={(event) => setRestoreBackupId(event.target.value)}
              placeholder="Backup ObjectId"
              style={inputStyle}
            />
            <input
              value={restoreConfirmation}
              onChange={(event) => setRestoreConfirmation(event.target.value)}
              placeholder={`Type: RESTORE ${restoreBackupId || '<backupId>'}`}
              style={inputStyle}
            />
            <button className="btn" type="submit" disabled={loading}>Restore Backup</button>
          </form>
          <div className="grid" style={{ marginTop: '0.8rem' }}>
            {backups.map((row) => (
              <article key={row._id} className="card">
                <strong>{row.type.toUpperCase()} / {row.storage}</strong>
                <p style={{ margin: '0.35rem 0' }}>Status: {row.status}</p>
                <p style={{ margin: 0, opacity: 0.8 }}>Created: {formatDate(row.createdAt)}</p>
                <p style={{ margin: '0.35rem 0 0', opacity: 0.8 }}>
                  {row.localPath ? `Local: ${row.localPath}` : row.s3Key ? `S3: ${row.s3Key}` : 'Path pending'}
                </p>
                <div style={{ marginTop: '0.6rem' }}>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setRestoreBackupId(row._id);
                      setRestoreConfirmation(`RESTORE ${row._id}`);
                    }}
                  >
                    Prepare Restore Token
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

const inputStyle: CSSProperties = {
  borderRadius: 10,
  border: '1px solid rgba(132,170,255,0.35)',
  background: 'rgba(8,18,44,0.55)',
  color: '#dbe7ff',
  padding: '0.65rem 0.75rem',
  width: '100%',
};
