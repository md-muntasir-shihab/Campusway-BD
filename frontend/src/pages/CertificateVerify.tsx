import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { ApiCertificateVerification, verifyExamCertificate } from '../services/api';

export default function CertificateVerifyPage() {
    const { certificateId = '' } = useParams();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || undefined;

    const [loading, setLoading] = useState(true);
    const [payload, setPayload] = useState<ApiCertificateVerification | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!certificateId) return;
        setLoading(true);
        verifyExamCertificate(certificateId, token)
            .then((res) => {
                setPayload(res.data);
                setError(null);
            })
            .catch((err) => {
                setPayload(null);
                setError(err.response?.data?.message || 'Verification failed.');
            })
            .finally(() => setLoading(false));
    }, [certificateId, token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-white flex items-center justify-center">
                <div className="h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
            </div>
        );
    }

    const isValid = Boolean(payload?.valid) && !error;
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/60 to-white py-16 px-4">
            <div className="max-w-2xl mx-auto bg-white/95 border border-slate-200 rounded-3xl shadow-xl p-8 dark:bg-slate-900/95 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    {isValid ? (
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    ) : (
                        <ShieldAlert className="w-8 h-8 text-rose-600" />
                    )}
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                        {isValid ? 'Certificate Verified' : 'Certificate Invalid'}
                    </h1>
                </div>

                <p className="mt-3 text-sm text-slate-600">
                    {isValid ? 'This certificate is valid and was issued by CampusWay.' : (error || payload?.message || 'Unable to verify this certificate.')}
                </p>

                {isValid && payload?.certificate && (
                    <div className="mt-6 space-y-3 text-sm text-slate-700">
                        <div><span className="font-semibold">Certificate ID:</span> <span className="font-mono">{payload.certificate.certificateId}</span></div>
                        <div><span className="font-semibold">Exam:</span> {payload.exam?.title || 'N/A'}</div>
                        <div><span className="font-semibold">Student:</span> {payload.student?.name || 'N/A'}</div>
                        <div><span className="font-semibold">Score:</span> {payload.result?.obtainedMarks}/{payload.result?.totalMarks} ({payload.result?.percentage}%)</div>
                        <div><span className="font-semibold">Issued At:</span> {payload.certificate.issuedAt ? new Date(payload.certificate.issuedAt).toLocaleString() : 'N/A'}</div>
                    </div>
                )}

                <div className="mt-8">
                    <Link to="/" className="inline-flex px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-colors">
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
