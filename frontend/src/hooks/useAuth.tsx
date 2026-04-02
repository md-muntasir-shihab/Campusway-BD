import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api, {
    clearAccessToken,
    clearAuthSessionHint,
    getAuthSessionStreamUrl,
    markAuthSessionHint,
    refreshAccessToken,
    setAccessToken,
    shouldAttemptAuthBootstrap,
} from '../services/api';

interface User {
    _id: string;
    username: string;
    email: string;
    role: 'superadmin' | 'admin' | 'moderator' | 'editor' | 'viewer' | 'support_agent' | 'finance_agent' | 'student' | 'chairman';
    fullName: string;
    status?: string;
    emailVerified?: boolean;
    phoneVerified?: boolean;
    twoFactorEnabled?: boolean;
    twoFactorMethod?: string | null;
    passwordExpiresAt?: string | null;
    mustChangePassword?: boolean;
    permissions?: {
        canEditExams: boolean;
        canManageStudents: boolean;
        canViewReports: boolean;
        canDeleteData: boolean;
        canManageFinance?: boolean;
        canManagePlans?: boolean;
    };
    redirectTo?: string;
    profile_completion_percentage?: number;
    profile_photo?: string;
    user_unique_id?: string;
    subscription?: {
        planCode?: string;
        planName?: string;
        isActive?: boolean;
        startDate?: string | null;
        expiryDate?: string | null;
        daysLeft?: number;
    };
    student_meta?: {
        department?: string;
        ssc_batch?: string;
        hsc_batch?: string;
        admittedAt?: string | null;
        groupIds?: string[];
    } | null;
    permissionsV2?: Record<string, Record<string, boolean>>;
}

interface Pending2FA {
    tempToken: string;
    method: string;
    maskedEmail: string;
    expiresInSeconds?: number;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    pending2FA: Pending2FA | null;
    setPending2FA: (data: Pending2FA | null) => void;
    forceLogoutAlert: boolean;
    setForceLogoutAlert: (val: boolean) => void;
    login: (
        identifier: string,
        password: string,
        options?: { portal?: 'student' | 'admin' | 'chairman' }
    ) => Promise<any>;
    completeLogin: (token: string, user: User) => void;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    pending2FA: null,
    setPending2FA: () => { },
    forceLogoutAlert: false,
    setForceLogoutAlert: () => { },
    login: async () => ({}),
    completeLogin: () => { },
    logout: async () => { },
    refreshUser: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pending2FA, setPending2FA] = useState<Pending2FA | null>(null);
    const [forceLogoutAlert, setForceLogoutAlert] = useState(false);

    const clearAuthState = useCallback(() => {
        setUser(null);
        setToken(null);
        setPending2FA(null);
        clearAccessToken();
        clearAuthSessionHint();
        queryClient.invalidateQueries({ queryKey: ['home'] }).catch(() => undefined);
        queryClient.invalidateQueries({ queryKey: ['home-settings'] }).catch(() => undefined);
    }, [queryClient]);

    const triggerForcedLogout = useCallback((_reason?: string) => {
        const shouldShowAlert = Boolean(user);
        clearAuthState();
        if (shouldShowAlert) {
            setForceLogoutAlert(true);
        }
    }, [clearAuthState, user]);

    const refreshUser = useCallback(async () => {
        try {
            const res = await api.get('/auth/me');
            setUser(res.data.user);
        } catch {
            clearAuthState();
        }
    }, [clearAuthState]);

    // Initial auth bootstrap from refresh cookie
    useEffect(() => {
        let cancelled = false;

        (async () => {
            if (!shouldAttemptAuthBootstrap()) {
                clearAuthState();
                setIsLoading(false);
                return;
            }

            const nextToken = await refreshAccessToken();
            if (cancelled) return;
            if (!nextToken) {
                clearAuthState();
                setIsLoading(false);
                return;
            }

            setToken(nextToken);
            try {
                const res = await api.get('/auth/me');
                if (!cancelled) setUser(res.data.user);
            } catch {
                if (!cancelled) clearAuthState();
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [clearAuthState]);

    // Force logout signal from API interceptor
    useEffect(() => {
        const onForceLogout = (event: Event) => {
            const detail = (event as CustomEvent<{ reason?: string }>).detail;
            triggerForcedLogout(detail?.reason);
        };

        window.addEventListener('campusway:force-logout', onForceLogout as EventListener);
        return () => {
            window.removeEventListener('campusway:force-logout', onForceLogout as EventListener);
        };
    }, [triggerForcedLogout]);

    // Session guard: SSE first, polling fallback with reconnect backoff
    useEffect(() => {
        if (!token || !user) return;

        let stopped = false;
        let source: EventSource | null = null;
        let pollId: number | null = null;
        let reconnectId: number | null = null;
        let reconnectAttempt = 0;

        const stopPolling = () => {
            if (pollId !== null) {
                window.clearInterval(pollId);
                pollId = null;
            }
        };

        const runSessionProbe = async () => {
            try {
                await api.get('/auth/me');
            } catch (err: any) {
                if (err.response?.status === 401) {
                    triggerForcedLogout(err.response?.data?.code || 'SESSION_INVALIDATED');
                }
            }
        };

        const startPolling = () => {
            if (pollId !== null) return;
            runSessionProbe();
            pollId = window.setInterval(runSessionProbe, 30000);
        };

        const scheduleReconnect = () => {
            if (stopped) return;
            if (reconnectId !== null) window.clearTimeout(reconnectId);

            const delayMs = Math.min(30000, 1000 * (2 ** reconnectAttempt));
            reconnectAttempt += 1;
            reconnectId = window.setTimeout(connectSse, delayMs);
        };

        const closeSource = () => {
            if (!source) return;
            source.close();
            source = null;
        };

        const teardownStreams = () => {
            closeSource();
            stopPolling();
            if (reconnectId !== null) {
                window.clearTimeout(reconnectId);
                reconnectId = null;
            }
        };

        const connectSse = () => {
            if (stopped) return;
            closeSource();

            source = new EventSource(getAuthSessionStreamUrl(token || undefined));

            source.addEventListener('session-connected', () => {
                reconnectAttempt = 0;
                stopPolling();
            });

            source.addEventListener('force-logout', (event) => {
                try {
                    const payload = JSON.parse((event as MessageEvent).data || '{}');
                    triggerForcedLogout(String(payload?.reason || 'SESSION_INVALIDATED'));
                } catch {
                    triggerForcedLogout('SESSION_INVALIDATED');
                }
            });

            source.onerror = () => {
                if (stopped) return;
                if (document.visibilityState === 'hidden') return;
                closeSource();
                startPolling();
                scheduleReconnect();
            };
        };

        connectSse();

        const handlePageHide = () => {
            teardownStreams();
        };

        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handlePageHide);

        return () => {
            stopped = true;
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handlePageHide);
            teardownStreams();
        };
    }, [token, user?._id, triggerForcedLogout]);

    const completeLogin = useCallback((newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        setPending2FA(null);
        setAccessToken(newToken);
        markAuthSessionHint(newUser.role === 'chairman'
            ? 'chairman'
            : ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'].includes(newUser.role)
                ? 'admin'
                : 'student');
        queryClient.invalidateQueries({ queryKey: ['home'] }).catch(() => undefined);
        queryClient.invalidateQueries({ queryKey: ['home-settings'] }).catch(() => undefined);
    }, [queryClient]);

    const login = useCallback(async (
        identifier: string,
        password: string,
        options?: { portal?: 'student' | 'admin' | 'chairman' }
    ) => {
        const portal = options?.portal;
        const endpoint = portal === 'admin'
            ? '/auth/admin/login'
            : portal === 'chairman'
                ? '/auth/chairman/login'
                : '/auth/login';
        const payload: Record<string, unknown> = { identifier, password };
        if (portal && endpoint === '/auth/login') {
            payload.portal = portal;
        }
        const res = await api.post(endpoint, payload);
        if (res.data.requires2fa) {
            setPending2FA({
                tempToken: res.data.tempToken,
                method: res.data.method,
                maskedEmail: res.data.maskedEmail,
                expiresInSeconds: res.data.expiresInSeconds,
            });
            return res.data;
        }

        completeLogin(res.data.token, res.data.user);
        return res.data;
    }, [completeLogin]);

    const logout = useCallback(async () => {
        if (token) {
            try {
                await api.post('/auth/logout');
            } catch {
                // ignore logout API failure
            }
        }
        clearAuthState();
    }, [token, clearAuthState]);

    const value = useMemo<AuthContextType>(() => ({
        user,
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        pending2FA,
        setPending2FA,
        forceLogoutAlert,
        setForceLogoutAlert,
        login,
        completeLogin,
        logout,
        refreshUser,
    }), [user, token, isLoading, pending2FA, forceLogoutAlert, login, completeLogin, logout, refreshUser]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
