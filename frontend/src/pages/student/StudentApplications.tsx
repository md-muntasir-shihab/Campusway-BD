import { useState, useEffect } from 'react';
import { getStudentApplications } from '../../services/api';
import { Loader2, GraduationCap, Building2, Calendar, Clock, CheckCircle2, XCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentApplications() {
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApps();
    }, []);

    const fetchApps = async () => {
        try {
            const res = await getStudentApplications();
            setApplications(res.data);
        } catch (err) {
            toast.error('Failed to load applications');
        } finally {
            setLoading(false);
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'accepted': return { color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400', icon: CheckCircle2, label: 'Accepted' };
            case 'rejected': return { color: 'text-rose-600 bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400', icon: XCircle, label: 'Rejected' };
            case 'under_review': return { color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400', icon: Clock, label: 'Under Review' };
            case 'submitted': return { color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-500/10 dark:text-cyan-400', icon: CheckCircle2, label: 'Submitted' };
            default: return { color: 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300', icon: Clock, label: 'Draft' };
        }
    };

    if (loading) return (
        <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
    );

    return (
        <div className="max-w-5xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Applications</h1>
                    <p className="text-slate-500 mt-1">Track the status of your university applications</p>
                </div>
                <button onClick={() => toast('Browse Universities to apply', { icon: '🔍' })} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl flex items-center gap-2 transition-colors shadow-sm">
                    <Search className="w-4 h-4" />
                    Find Universities
                </button>
            </div>

            {applications.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                        <GraduationCap className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Applications Yet</h3>
                    <p className="text-slate-500 max-w-sm mb-6">You haven't applied to any universities yet. Complete your profile and start exploring your future!</p>
                    <button onClick={() => toast('Browse Universities to start applying', { icon: '🔍' })} className="px-6 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 font-medium rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                        Browse Universities
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {applications.map((app) => {
                        const config = getStatusConfig(app.status);
                        const StatusIcon = config.icon;

                        return (
                            <div key={app._id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Building2 className="w-6 h-6 text-slate-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{app.program}</h3>
                                        <p className="text-slate-500 flex items-center gap-1.5 mt-1">
                                            {app.university_id?.name || 'Unknown University'}
                                        </p>
                                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-4 h-4" />
                                                Applied: {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-2">
                                    <div className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium text-sm ${config.color}`}>
                                        <StatusIcon className="w-4 h-4" />
                                        {config.label}
                                    </div>
                                    <button className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
