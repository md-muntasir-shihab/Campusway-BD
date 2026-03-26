import { useState } from 'react';
import DashboardConfigPanel from './DashboardConfigPanel';
import NotificationsPanel from './NotificationsPanel';
import BadgeManagementPanel from './BadgeManagementPanel';

type ControlTab = 'config' | 'notifications' | 'badges';

export default function StudentDashboardControlPanel() {
    const [tab, setTab] = useState<ControlTab>('config');

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-bold text-white">Student Dashboard Control</h2>
                <p className="text-xs text-slate-500">Manage student dashboard config, notifications, and badges in one place.</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {[
                    ['config', 'Dashboard Config'],
                    ['notifications', 'Notifications'],
                    ['badges', 'Badges'],
                ].map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id as ControlTab)}
                        className={`rounded-xl px-4 py-2 text-sm transition-colors ${
                            tab === id ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white' : 'bg-slate-900/65 text-slate-300 hover:bg-white/10'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'config' ? <DashboardConfigPanel /> : null}
            {tab === 'notifications' ? <NotificationsPanel /> : null}
            {tab === 'badges' ? <BadgeManagementPanel /> : null}
        </div>
    );
}
