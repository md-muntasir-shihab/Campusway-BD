'use client';

import { FormEvent, useEffect, useState } from 'react';
import { createSupportTicket, getStudentNotices, getStudentProfile, getStudentSupportTickets } from '@/lib/api';
import { NoticeRow, TicketRow } from '@/lib/types';

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function StudentPortal() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState<{
    username?: string; email?: string; name?: string;
    planCode?: string; planName?: string; expiryDate?: string | null;
    active?: boolean; daysLeft?: number | null;
    ctaLabel?: string; ctaUrl?: string; ctaMode?: string;
    profileCompletion?: number; overallRank?: number | null;
  }>({});
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => { setToken(window.localStorage.getItem('campusway-token') || ''); }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true); setError('');
    (async () => {
      try {
        const [profileRes, noticeRes, ticketRes] = await Promise.all([
          getStudentProfile(token), getStudentNotices(token), getStudentSupportTickets(token),
        ]);
        if (cancelled) return;
        setProfile({
          username: profileRes?.user?.username, email: profileRes?.user?.email, name: profileRes?.name,
          planCode: profileRes?.subscription?.planCode, planName: profileRes?.subscription?.planName,
          expiryDate: profileRes?.subscription?.expiryDate || null, active: Boolean(profileRes?.subscription?.isActive),
          daysLeft: profileRes?.subscription?.daysLeft ?? null, ctaLabel: profileRes?.subscription?.ctaLabel,
          ctaUrl: profileRes?.subscription?.ctaUrl, ctaMode: profileRes?.subscription?.ctaMode,
          profileCompletion: profileRes?.profileCompletionPercentage, overallRank: profileRes?.overallRank ?? null,
        });
        setNotices(noticeRes.items || []); setTickets(ticketRes.items || []);
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load.'); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function handleCreateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (!subject.trim() || !message.trim()) { setError('Subject and message required.'); return; }
    setLoading(true); setError('');
    try {
      await createSupportTicket(token, { subject: subject.trim(), message: message.trim(), priority });
      const ticketRes = await getStudentSupportTickets(token);
      setTickets(ticketRes.items || []); setSubject(''); setMessage('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Ticket create failed.'); }
    finally { setLoading(false); }
  }

  if (!token) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card-elevated" style={{ maxWidth: 420, textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎓</div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem' }}>Student Login Required</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Login from the student app first, then reload this page.
          </p>
        </div>
      </div>
    );
  }

  const completionPct = profile.profileCompletion ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* ── Profile Header ── */}
      <header className="card-elevated" style={{ padding: '1.5rem 1.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(52,120,246,0.25), rgba(139,92,246,0.25))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', flexShrink: 0,
          }}>
            {(profile.name || profile.username || 'S').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              {profile.name || profile.username || profile.email || 'Student'}
            </h1>
            <p style={{ margin: '0.15rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {profile.email || 'Student Portal'}
            </p>
          </div>
          {profile.ctaLabel && profile.ctaUrl ? (
            <a href={profile.ctaUrl} className="btn" style={{ textDecoration: 'none' }}>{profile.ctaLabel}</a>
          ) : null}
        </div>

        {/* Subscription & Stats */}
        <div className="grid" style={{ marginTop: '1.2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.7rem' }}>
          <div className="kpi-card" data-accent="blue">
            <p className="kpi-label">Subscription</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
              <span className="kpi-value" style={{ fontSize: '1.1rem' }}>{profile.planName || profile.planCode || 'None'}</span>
              {profile.active ? (
                <span className="pill pill-success" style={{ fontSize: '0.65rem', padding: '0.12rem 0.4rem' }}>Active</span>
              ) : profile.planCode ? (
                <span className="pill pill-danger" style={{ fontSize: '0.65rem', padding: '0.12rem 0.4rem' }}>Expired</span>
              ) : null}
            </div>
          </div>
          <div className="kpi-card" data-accent={profile.active && profile.daysLeft != null && profile.daysLeft <= 7 ? 'amber' : 'green'}>
            <p className="kpi-label">Expiry</p>
            <p className="kpi-value" style={{ fontSize: '1.1rem' }}>{formatDate(profile.expiryDate)}</p>
            {profile.daysLeft !== null && profile.daysLeft !== undefined && profile.active ? (
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.72rem', color: profile.daysLeft <= 7 ? '#fbbf24' : 'var(--text-muted)' }}>
                {profile.daysLeft} days remaining
              </p>
            ) : null}
          </div>
          {profile.profileCompletion !== undefined ? (
            <div className="kpi-card" data-accent={completionPct >= 70 ? 'green' : 'amber'}>
              <p className="kpi-label">Profile</p>
              <p className="kpi-value" style={{ fontSize: '1.1rem' }}>{completionPct}%</p>
              <div style={{ marginTop: '0.4rem', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, completionPct)}%`, borderRadius: 2, background: completionPct >= 70 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)', transition: 'width 0.4s' }} />
              </div>
            </div>
          ) : null}
          {profile.overallRank !== null && profile.overallRank !== undefined ? (
            <div className="kpi-card" data-accent="violet">
              <p className="kpi-label">Rank</p>
              <p className="kpi-value" style={{ fontSize: '1.1rem' }}>#{profile.overallRank}</p>
            </div>
          ) : null}
        </div>
      </header>

      {error && <div className="alert alert-error">⚠ {error}</div>}
      {loading && <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>}

      {/* ── Notices & Ticket Form ── */}
      <div className="grid grid-2">
        <div className="card-elevated" style={{ padding: '1.3rem' }}>
          <p className="section-title">📢 Notices</p>
          {notices.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No notices right now.</p>
          ) : (
            <div className="grid" style={{ gap: '0.5rem' }}>
              {notices.map((n) => (
                <div key={n._id} style={{
                  padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)', background: 'rgba(8, 18, 44, 0.35)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{n.title}</span>
                    <span className={n.isActive ? 'pill pill-success' : 'pill'} style={{ fontSize: '0.65rem' }}>
                      {n.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1.2rem' }}>
          <p className="section-title">🎫 New Support Ticket</p>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} onSubmit={handleCreateTicket}>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
            <textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue" rows={4} />
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <button className="btn" type="submit" disabled={loading}>Submit Ticket</button>
          </form>
        </div>
      </div>

      {/* ── Ticket Timeline ── */}
      <div className="card-elevated" style={{ padding: '1.3rem' }}>
        <p className="section-title">Ticket History</p>
        {tickets.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tickets yet.</p>
        ) : (
          <div className="grid" style={{ gap: '0.5rem' }}>
            {tickets.map((t) => {
              const statusColors: Record<string, string> = { open: 'pill-warning', in_progress: 'pill-violet', resolved: 'pill-success', closed: 'pill' };
              const priorityColors: Record<string, string> = { high: 'pill-danger', medium: 'pill-warning', low: 'pill' };
              return (
                <div key={t._id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)', background: 'rgba(8, 18, 44, 0.35)',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{t.ticketNo}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{t.subject}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                      <span className={`pill ${statusColors[t.status] || 'pill'}`} style={{ fontSize: '0.65rem' }}>{t.status.replace('_', ' ')}</span>
                      <span className={`pill ${priorityColors[t.priority] || 'pill'}`} style={{ fontSize: '0.65rem' }}>{t.priority}</span>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(t.updatedAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
