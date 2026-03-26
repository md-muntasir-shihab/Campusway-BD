import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { changePassword } from '../../../services/api';

export default function AdminNewsPasswordSection() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const mutation = useMutation({
        mutationFn: async () => (await changePassword(currentPassword, newPassword)).data,
        onSuccess: () => {
            toast.success('Password updated');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Password update failed'),
    });

    function onSubmit(event: FormEvent) {
        event.preventDefault();
        if (newPassword.length < 8) {
            toast.error('New password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('New password and confirmation do not match');
            return;
        }
        mutation.mutate();
    }

    return (
        <form onSubmit={onSubmit} className="card-flat max-w-xl space-y-4 border border-cyan-500/20 p-4">
            <input
                type="text"
                name="username"
                autoComplete="username"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                value="admin"
                readOnly
            />
            <div>
                <h2 className="text-xl font-semibold">Change Password</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Update your admin password for News System access.</p>
            </div>
            <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Current Password</span>
                <input
                    className="input-field"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                />
            </label>
            <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">New Password</span>
                <input
                    className="input-field"
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                />
            </label>
            <label className="space-y-1">
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Confirm New Password</span>
                <input
                    className="input-field"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                />
            </label>
            <button className="btn-primary" type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Updating...' : 'Update Password'}
            </button>
        </form>
    );
}
