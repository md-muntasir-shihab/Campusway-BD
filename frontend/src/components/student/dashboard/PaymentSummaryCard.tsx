import { Link } from 'react-router-dom';
import { Wallet, AlertCircle, UploadCloud } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { DashboardPaymentSummary } from '../../../services/api';

interface Props {
    payments: DashboardPaymentSummary;
}

export default function PaymentSummaryCard({ payments }: Props) {
    const hasPending = payments.pendingCount > 0;
    const lastIsManual = payments.lastPayment?.method === 'manual' || payments.lastPayment?.method === 'bkash' || payments.lastPayment?.method === 'nagad';

    return (
        <DashboardSection delay={0.14}>
            <div className={`rounded-2xl border p-4 ${
                hasPending
                    ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-cyan-500" />
                        Payments
                    </h3>
                    {hasPending && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-3 h-3" /> {payments.pendingCount} pending
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center">
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">৳{payments.totalPaid.toLocaleString()}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Total Paid</p>
                    </div>
                    <div className="text-center">
                        <p className={`text-lg font-bold ${hasPending ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                            ৳{payments.pendingAmount.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Pending</p>
                    </div>
                </div>

                {payments.lastPayment && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                        Last: ৳{payments.lastPayment.amount} via {payments.lastPayment.method} — {new Date(payments.lastPayment.date).toLocaleDateString()}
                    </div>
                )}

                <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <Link to="/payments" className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        View all payments &rarr;
                    </Link>
                    {hasPending && lastIsManual && (
                        <Link
                            to="/payments?upload=1"
                            className="flex items-center gap-1 text-[11px] font-semibold text-white bg-amber-500 hover:bg-amber-600 dark:bg-amber-500/90 dark:hover:bg-amber-500 px-2.5 py-1 rounded-lg transition"
                        >
                            <UploadCloud className="w-3 h-3" />
                            Upload Payment Proof
                        </Link>
                    )}
                </div>
            </div>
        </DashboardSection>
    );
}
