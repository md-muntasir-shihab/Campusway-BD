import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { ackStudentAlert, getActiveStudentAlerts } from '../../services/api';

type StudentAlert = {
    _id: string;
    title?: string;
    message: string;
    link?: string;
    requireAck?: boolean;
    acknowledged?: boolean;
    priority?: number;
};

export default function GlobalAlertGate() {
    const [alerts, setAlerts] = useState<StudentAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [ackLoading, setAckLoading] = useState<string | null>(null);

    const fetchAlerts = async () => {
        try {
            const { data } = await getActiveStudentAlerts();
            setAlerts(data.alerts || []);
        } catch {
            // silent by design; gate should not break student pages
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchAlerts();
        const interval = setInterval(() => {
            void fetchAlerts();
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const blockingAlert = useMemo(() => {
        return alerts
            .filter((alert) => alert.requireAck && !alert.acknowledged)
            .sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0))[0];
    }, [alerts]);

    const acknowledge = async (alertId: string) => {
        try {
            setAckLoading(alertId);
            await ackStudentAlert(alertId);
            toast.success('Alert acknowledged');
            await fetchAlerts();
        } catch {
            toast.error('Failed to acknowledge alert');
        } finally {
            setAckLoading(null);
        }
    };

    if (loading) return null;
    const tickerAlerts = alerts.slice().sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0));
    if (!blockingAlert && tickerAlerts.length === 0) return null;

    return (
        <>
            {tickerAlerts.length > 0 ? (
                <div className="fixed top-0 left-0 right-0 z-[95] bg-amber-500/90 text-slate-900 border-b border-amber-300/60 shadow-sm">
                    <div className="overflow-hidden whitespace-nowrap py-2 px-4">
                        <div className="inline-flex min-w-full animate-marquee gap-10 text-xs sm:text-sm font-medium">
                            {tickerAlerts.map((alert) => (
                                <span key={alert._id}>
                                    {alert.title ? `${alert.title}: ` : ''}{alert.message}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            {blockingAlert ? (
                <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-2xl border border-amber-400/30 bg-slate-900/95 shadow-2xl p-6">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-300 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">{blockingAlert.title || 'Important Alert'}</h3>
                                <p className="mt-2 text-sm text-slate-200 leading-relaxed">{blockingAlert.message}</p>
                                {blockingAlert.link ? (
                                    <a
                                        href={blockingAlert.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-3 inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 text-sm"
                                    >
                                        Read More <ExternalLink className="w-4 h-4" />
                                    </a>
                                ) : null}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => void acknowledge(blockingAlert._id)}
                                disabled={ackLoading === blockingAlert._id}
                                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-900 font-semibold text-sm hover:bg-amber-400 disabled:opacity-60"
                            >
                                {ackLoading === blockingAlert._id ? 'Acknowledging...' : 'Acknowledge And Continue'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
