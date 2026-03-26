import { Link } from 'react-router-dom';
import { Shield, User, KeyRound, Clock } from 'lucide-react';
import DashboardSection from './DashboardSection';

interface Props {
    security: { lastLogin: string; twoFactorEnabled: boolean };
}

export default function AccountSecurity({ security }: Props) {
    return (
        <DashboardSection delay={0.32}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-sky-500" />
                        Account & Security
                    </h3>
                    <span className={`flex items-center gap-1 text-[10px] font-bold ${security.twoFactorEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {security.twoFactorEnabled ? '2FA On' : '2FA Off'}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                    <Link to="/profile" className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Edit Profile</span>
                    </Link>
                    <Link to="/profile/security" className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <KeyRound className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</span>
                    </Link>
                </div>

                {security.lastLogin && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Last login: {new Date(security.lastLogin).toLocaleString()}
                    </p>
                )}
            </div>
        </DashboardSection>
    );
}
