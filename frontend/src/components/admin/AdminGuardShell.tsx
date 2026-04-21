import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useModuleAccess } from '../../hooks/useModuleAccess';
import AdminShell from './AdminShell';

export type AdminAllowedRole =
    | 'superadmin'
    | 'admin'
    | 'moderator'
    | 'editor'
    | 'viewer'
    | 'support_agent'
    | 'finance_agent';

export type AdminLegacyPermission =
    | 'canEditExams'
    | 'canManageStudents'
    | 'canViewReports'
    | 'canDeleteData'
    | 'canManageFinance'
    | 'canManagePlans';

const DEFAULT_ALLOWED_ROLES: AdminAllowedRole[] = [
    'superadmin',
    'admin',
    'moderator',
    'editor',
    'viewer',
    'support_agent',
    'finance_agent',
];

type AdminGuardShellProps = {
    title: string;
    description?: string;
    children: ReactNode;
    allowedRoles?: AdminAllowedRole[];
    requiredModule?: string;
    requiredAction?: string;
    requiredLegacyPermission?: AdminLegacyPermission;
};

const AdminShellNestingContext = createContext(false);

export default function AdminGuardShell({
    title,
    description,
    children,
    allowedRoles = DEFAULT_ALLOWED_ROLES,
    requiredModule,
    requiredAction = 'view',
    requiredLegacyPermission,
}: AdminGuardShellProps) {
    const { user, isLoading } = useAuth();
    const { hasAccess } = useModuleAccess();
    const isNestedInsideAdminShell = useContext(AdminShellNestingContext);
    const location = useLocation();
    const forceResetPath = '/__cw_admin__/settings/admin-profile';
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            setTimedOut(false);
            return;
        }

        const timer = setTimeout(() => {
            setTimedOut(true);
        }, 6000);

        return () => clearTimeout(timer);
    }, [isLoading]);

    if (isLoading) {
        if (timedOut) {
            return <Navigate to="/__cw_admin__/login" replace />;
        }
        return <div className="section-container py-16 text-sm text-text-muted dark:text-dark-text/70">Checking admin access...</div>;
    }

    if (!user) {
        return <Navigate to="/__cw_admin__/login" replace />;
    }

    if (!allowedRoles.includes(user.role as AdminAllowedRole)) {
        return <Navigate to="/__cw_admin__/access-denied" replace />;
    }

    if (user.mustChangePassword && location.pathname !== forceResetPath) {
        return <Navigate to={forceResetPath} replace state={{ forcePasswordReset: true }} />;
    }

    if (requiredModule && !hasAccess(requiredModule, requiredAction)) {
        return <Navigate to="/__cw_admin__/access-denied" replace />;
    }

    if (requiredLegacyPermission && user.role !== 'superadmin' && !user.permissions?.[requiredLegacyPermission]) {
        return <Navigate to="/__cw_admin__/access-denied" replace />;
    }

    if (isNestedInsideAdminShell) {
        return <>{children}</>;
    }

    return (
        <AdminShellNestingContext.Provider value={true}>
            <AdminShell key={location.pathname} title={title} description={description}>
                {children}
            </AdminShell>
        </AdminShellNestingContext.Provider>
    );
}
