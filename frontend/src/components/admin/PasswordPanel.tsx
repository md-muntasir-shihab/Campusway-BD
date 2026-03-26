import { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound, Eye, EyeOff, Save, RefreshCw } from 'lucide-react';
import { changePassword } from '../../services/api';

export default function PasswordPanel() {
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [show, setShow] = useState({ current: false, new: false, confirm: false });
    const [saving, setSaving] = useState(false);

    const onSave = async () => {
        if (!form.currentPassword || !form.newPassword) { toast.error('All fields required'); return; }
        if (form.newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
        if (form.newPassword !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
        setSaving(true);
        try {
            await changePassword(form.currentPassword, form.newPassword);
            toast.success('Password changed successfully!');
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e.response?.data?.message || 'Failed to change password');
        } finally { setSaving(false); }
    };

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                    <KeyRound className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-lg font-bold text-white">Change Password</h2>
                <p className="text-xs text-slate-500 mt-1">Update your account password</p>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl border border-indigo-500/10 p-6 space-y-4">
                {[
                    { label: 'Current Password', k: 'currentPassword' as const, sk: 'current' as const },
                    { label: 'New Password', k: 'newPassword' as const, sk: 'new' as const },
                    { label: 'Confirm New Password', k: 'confirmPassword' as const, sk: 'confirm' as const },
                ].map(f => (
                    <div key={f.k}>
                        <label className="text-xs text-slate-400 font-medium">{f.label}</label>
                        <div className="relative mt-1">
                            <input
                                type={show[f.sk] ? 'text' : 'password'}
                                value={form[f.k]}
                                onChange={e => setForm({ ...form, [f.k]: e.target.value })}
                                className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white focus:ring-2 focus:ring-indigo-500/30 focus:outline-none"
                            />
                            <button type="button" onClick={() => setShow({ ...show, [f.sk]: !show[f.sk] })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                {show[f.sk] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                ))}
                <button onClick={onSave} disabled={saving}
                    className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-sm px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 shadow-lg shadow-indigo-500/20">
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Update Password
                </button>
            </div>
        </div>
    );
}
