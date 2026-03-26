import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
    adminCreateExpense,
    adminCreatePayment,
    adminDispatchReminders,
    adminGetDues,
    adminGetExpenses,
    adminGetFinanceSummary,
    adminGetPayments,
    adminGetStudents,
    adminGetSubscriptionPlans,
} from '../../services/api';
import { RefreshCw } from 'lucide-react';

function money(value: number): string {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(Number(value || 0));
}

export default function FinancePanel() {
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpenses: 0, netProfit: 0 });
    const [payments, setPayments] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [dues, setDues] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);

    const [payment, setPayment] = useState({
        studentId: '',
        subscriptionPlanId: '',
        amount: '',
        method: 'bkash',
        entryType: 'subscription',
        date: '',
    });
    const [expense, setExpense] = useState({
        category: 'misc',
        amount: '',
        date: '',
        vendor: '',
    });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [s, p, e, d, st, sp] = await Promise.all([
                adminGetFinanceSummary(),
                adminGetPayments({ page: 1, limit: 6 }),
                adminGetExpenses({ page: 1, limit: 6 }),
                adminGetDues({ page: 1, limit: 6 }),
                adminGetStudents({ page: 1, limit: 200 }),
                adminGetSubscriptionPlans(),
            ]);
            setSummary(s.data as any);
            setPayments(p.data.items || []);
            setExpenses(e.data.items || []);
            setDues(d.data.items || []);
            setStudents(st.data.items || []);
            setPlans(sp.data.items || []);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Finance data load failed');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const savePayment = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!payment.studentId || !payment.amount) return toast.error('Student and amount are required');
        try {
            await adminCreatePayment({
                studentId: payment.studentId,
                subscriptionPlanId: payment.subscriptionPlanId || undefined,
                amount: Number(payment.amount),
                method: payment.method as any,
                entryType: payment.entryType as any,
                date: payment.date || undefined,
            });
            toast.success('Payment recorded');
            setPayment((prev) => ({ ...prev, amount: '' }));
            await load();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Payment save failed');
        }
    };

    const saveExpense = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!expense.amount) return toast.error('Amount is required');
        try {
            await adminCreateExpense({
                category: expense.category as any,
                amount: Number(expense.amount),
                date: expense.date || undefined,
                vendor: expense.vendor || undefined,
            });
            toast.success('Expense recorded');
            setExpense((prev) => ({ ...prev, amount: '' }));
            await load();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Expense save failed');
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h2 className="text-xl font-bold text-white">Accounts & Finance</h2>
                        <p className="text-sm text-slate-400">Manual payments, expenses, dues and analytics.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => void load()} className="inline-flex items-center gap-1 rounded-xl border border-indigo-500/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                        <button onClick={() => adminDispatchReminders().then(() => toast.success('Reminder job done')).catch((e) => toast.error(e.response?.data?.message || 'Reminder job failed'))} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">
                            Dispatch Reminders
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"><p className="text-xs text-emerald-200">Total Income</p><p className="mt-1 text-lg font-bold text-white">{money(summary.totalIncome)}</p></div>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4"><p className="text-xs text-rose-200">Total Expenses</p><p className="mt-1 text-lg font-bold text-white">{money(summary.totalExpenses)}</p></div>
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4"><p className="text-xs text-indigo-200">Net Profit/Loss</p><p className="mt-1 text-lg font-bold text-white">{money(summary.netProfit)}</p></div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <form onSubmit={savePayment} className="rounded-2xl border border-indigo-500/10 bg-slate-900/50 p-4 space-y-2">
                    <h3 className="text-white font-semibold">Add Payment</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <select value={payment.studentId} onChange={(e) => setPayment((prev) => ({ ...prev, studentId: e.target.value }))} className="rounded-lg border border-indigo-500/20 bg-slate-950/70 px-3 py-2 text-sm text-white">
                            <option value="">Student</option>{students.map((s) => <option key={s._id} value={s._id}>{s.fullName}</option>)}
                        </select>
                        <select value={payment.subscriptionPlanId} onChange={(e) => setPayment((prev) => ({ ...prev, subscriptionPlanId: e.target.value }))} className="rounded-lg border border-indigo-500/20 bg-slate-950/70 px-3 py-2 text-sm text-white">
                            <option value="">Plan (optional)</option>{plans.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                        <input type="number" min="0" placeholder="Amount" value={payment.amount} onChange={(e) => setPayment((prev) => ({ ...prev, amount: e.target.value }))} className="rounded-lg border border-indigo-500/20 bg-slate-950/70 px-3 py-2 text-sm text-white" />
                        <select value={payment.method} onChange={(e) => setPayment((prev) => ({ ...prev, method: e.target.value }))} className="rounded-lg border border-indigo-500/20 bg-slate-950/70 px-3 py-2 text-sm text-white">
                            <option value="bkash">bKash</option><option value="cash">Cash</option><option value="manual">Manual</option><option value="bank">Bank</option>
                        </select>
                        <select value={payment.entryType} onChange={(e) => setPayment((prev) => ({ ...prev, entryType: e.target.value }))} className="rounded-lg border border-indigo-500/20 bg-slate-950/70 px-3 py-2 text-sm text-white">
                            <option value="subscription">Subscription</option><option value="due_settlement">Due Settlement</option><option value="other_income">Other Income</option>
                        </select>
                        <input type="date" value={payment.date} onChange={(e) => setPayment((prev) => ({ ...prev, date: e.target.value }))} className="rounded-lg border border-indigo-500/20 bg-slate-950/70 px-3 py-2 text-sm text-white" />
                    </div>
                    <button type="submit" className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Save Payment</button>
                </form>

                <form onSubmit={saveExpense} className="rounded-2xl border border-indigo-500/10 bg-slate-900/50 p-4 space-y-2">
                    <h3 className="text-white font-semibold">Add Expense</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <select value={expense.category} onChange={(e) => setExpense((prev) => ({ ...prev, category: e.target.value }))} className="rounded-lg border border-indigo-500/20 bg-slate-950/70 px-3 py-2 text-sm text-white">
                            <option value="server">Server</option><option value="marketing">Marketing</option><option value="staff_salary">Staff Salary</option><option value="moderator_salary">Moderator Salary</option><option value="tools">Tools</option><option value="misc">Misc</option>
                        </select>
                        <input type="number" min="0" placeholder="Amount" value={expense.amount} onChange={(e) => setExpense((prev) => ({ ...prev, amount: e.target.value }))} className="rounded-lg border border-indigo-500/20 bg-slate-950/70 px-3 py-2 text-sm text-white" />
                        <input type="date" value={expense.date} onChange={(e) => setExpense((prev) => ({ ...prev, date: e.target.value }))} className="rounded-lg border border-indigo-500/20 bg-slate-950/70 px-3 py-2 text-sm text-white" />
                        <input placeholder="Vendor" value={expense.vendor} onChange={(e) => setExpense((prev) => ({ ...prev, vendor: e.target.value }))} className="rounded-lg border border-indigo-500/20 bg-slate-950/70 px-3 py-2 text-sm text-white" />
                    </div>
                    <button type="submit" className="rounded-xl bg-fuchsia-600 px-3 py-2 text-sm font-semibold text-white">Save Expense</button>
                </form>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/50 p-4 xl:col-span-2">
                    <h3 className="text-white font-semibold mb-2">Recent Payments</h3>
                    <div className="space-y-2">{payments.length === 0 ? <p className="text-sm text-slate-500">No payments found.</p> : payments.map((item) => <div key={item._id} className="rounded-lg border border-indigo-500/10 bg-slate-950/60 p-3 text-sm text-slate-200">{(typeof item.studentId === 'object' ? item.studentId?.full_name : item.studentId) || 'Unknown'} - {money(item.amount)} - {item.method}</div>)}</div>
                </div>
                <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/50 p-4">
                    <h3 className="text-white font-semibold mb-2">Due Ledger</h3>
                    <div className="space-y-2">{dues.length === 0 ? <p className="text-sm text-slate-500">No dues found.</p> : dues.map((item) => <div key={item._id} className="rounded-lg border border-indigo-500/10 bg-slate-950/60 p-3 text-sm text-slate-200">{(typeof item.studentId === 'object' ? item.studentId?.full_name : item.studentId) || 'Unknown'} - <span className="text-amber-300">{money(item.netDue)}</span></div>)}</div>
                </div>
            </div>

            <div className="rounded-xl border border-indigo-500/10 bg-slate-900/50 p-4">
                <h3 className="text-white font-semibold mb-2">Recent Expenses</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{expenses.length === 0 ? <p className="text-sm text-slate-500">No expenses found.</p> : expenses.map((item) => <div key={item._id} className="rounded-lg border border-indigo-500/10 bg-slate-950/60 p-3 text-sm text-slate-200 capitalize">{item.category.replace(/_/g, ' ')} - {money(item.amount)}</div>)}</div>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                Manual mode: online payment gateway is disabled. Admin records all transactions manually.
            </div>
        </div>
    );
}
