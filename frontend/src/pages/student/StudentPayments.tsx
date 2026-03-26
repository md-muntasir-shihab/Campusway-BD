import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export default function StudentPayments() {
    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h1 className="text-2xl font-bold">Payments</h1>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    Online payment and billing history will be available here soon.
                </p>

                <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 p-4">
                    <p className="text-sm font-medium">Need to activate your subscription right now?</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Go to plans, choose one, and contact admin for activation approval.</p>
                    <Link to="/subscription-plans" className="btn-primary mt-3 inline-flex text-sm">
                        Open Subscription Plans
                        <ExternalLink className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}


