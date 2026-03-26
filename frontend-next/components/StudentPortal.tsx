'use client';

import { CSSProperties, FormEvent, useEffect, useState } from 'react';
import { createSupportTicket, getStudentNotices, getStudentProfile, getStudentSupportTickets } from '@/lib/api';
import { NoticeRow, TicketRow } from '@/lib/types';

function formatDate(value?: string | null): string {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
}

export default function StudentPortal() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState<{ username?: string; email?: string; planCode?: string; expiryDate?: string | null; active?: boolean }>({});
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    const stored = window.localStorage.getItem('campusway-token') || '';
    setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const [profileRes, noticeRes, ticketRes] = await Promise.all([
          getStudentProfile(token),
          getStudentNotices(token),
          getStudentSupportTickets(token),
        ]);

        if (cancelled) return;
        setProfile({
          username: profileRes?.user?.username,
          email: profileRes?.user?.email,
          planCode: profileRes?.subscription?.planCode,
          expiryDate: profileRes?.subscription?.expiryDate || null,
          active: Boolean(profileRes?.subscription?.isActive),
        });
        setNotices(noticeRes.items || []);
        setTickets(ticketRes.items || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load student portal.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleCreateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await createSupportTicket(token, {
        subject: subject.trim(),
        message: message.trim(),
        priority,
      });
      const ticketRes = await getStudentSupportTickets(token);
      setTickets(ticketRes.items || []);
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ticket create failed.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Student Token Required</h2>
        <p>Please login from legacy student app first, then reload this page.</p>
      </section>
    );
  }

  return (
    <section className="grid" style={{ gap: '1rem' }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Student Portal (Next Hybrid)</h1>
        <p style={{ marginTop: 0, opacity: 0.88 }}>Subscription visibility, notice feed, and support workflow.</p>
        <div className="grid grid-3">
          <article className="card">
            <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.8 }}>Student</p>
            <strong>{profile.username || profile.email || 'N/A'}</strong>
          </article>
          <article className="card">
            <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.8 }}>Plan</p>
            <strong>{profile.planCode || 'No active plan'}</strong>
          </article>
          <article className="card">
            <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.8 }}>Expiry</p>
            <strong>{formatDate(profile.expiryDate)}</strong>
          </article>
        </div>
      </div>

      {error && <div className="card" style={{ borderColor: 'rgba(255,102,102,.5)' }}>{error}</div>}
      {loading && <div className="card">Loading...</div>}

      <div className="grid grid-2">
        <section className="card">
          <h3 style={{ marginTop: 0 }}>Latest Notices</h3>
          <div className="grid">
            {notices.map((notice) => (
              <article key={notice._id} className="card">
                <strong>{notice.title}</strong>
                <p style={{ margin: '0.35rem 0' }}>{notice.message}</p>
                <span className="pill">{notice.isActive ? 'Active' : 'Inactive'}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="card">
          <h3 style={{ marginTop: 0 }}>Create Support Ticket</h3>
          <form className="grid" onSubmit={handleCreateTicket}>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Ticket subject"
              style={inputStyle}
            />
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Describe your issue"
              rows={4}
              style={inputStyle}
            />
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as 'low' | 'medium' | 'high')}
              style={inputStyle}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button className="btn" type="submit" disabled={loading}>Submit Ticket</button>
          </form>
        </section>
      </div>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Ticket Timeline</h3>
        <div className="grid">
          {tickets.map((ticket) => (
            <article key={ticket._id} className="card">
              <strong>{ticket.ticketNo}</strong>
              <p style={{ margin: '0.35rem 0' }}>{ticket.subject}</p>
              <span className="pill">{ticket.status}</span>
              <span className="pill" style={{ marginLeft: '0.5rem' }}>{ticket.priority}</span>
              <p style={{ margin: '0.35rem 0 0', opacity: 0.8 }}>Updated: {formatDate(ticket.updatedAt)}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

const inputStyle: CSSProperties = {
  borderRadius: 10,
  border: '1px solid rgba(132,170,255,0.35)',
  background: 'rgba(8,18,44,0.55)',
  color: '#dbe7ff',
  padding: '0.65rem 0.75rem',
  width: '100%',
};
