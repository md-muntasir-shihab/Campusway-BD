import { IUserPermissions, UserRole } from '../models/User';
import {
    PERMISSION_ACTIONS,
    PERMISSION_MODULES,
    ROLE_PERMISSION_MATRIX,
    type PermissionAction,
    type PermissionModule,
} from '../security/permissionsMatrix';

export const ROLE_PERMISSION_PRESETS: Record<UserRole, IUserPermissions> = {
    superadmin: {
        canEditExams: true,
        canManageStudents: true,
        canViewReports: true,
        canDeleteData: true,
        canManageFinance: true,
        canManagePlans: true,
        canManageTickets: true,
        canManageBackups: true,
        canRevealPasswords: true,
    },
    admin: {
        canEditExams: true,
        canManageStudents: true,
        canViewReports: true,
        canDeleteData: false,
        canManageFinance: true,
        canManagePlans: true,
        canManageTickets: true,
        canManageBackups: true,
        canRevealPasswords: false,
    },
    moderator: {
        canEditExams: true,
        canManageStudents: true,
        canViewReports: true,
        canDeleteData: false,
        canManageFinance: false,
        canManagePlans: false,
        canManageTickets: true,
        canManageBackups: false,
        canRevealPasswords: false,
    },
    student: {
        canEditExams: false,
        canManageStudents: false,
        canViewReports: false,
        canDeleteData: false,
        canManageFinance: false,
        canManagePlans: false,
        canManageTickets: false,
        canManageBackups: false,
        canRevealPasswords: false,
    },
    editor: {
        canEditExams: true,
        canManageStudents: false,
        canViewReports: false,
        canDeleteData: false,
        canManageFinance: false,
        canManagePlans: false,
        canManageTickets: false,
        canManageBackups: false,
        canRevealPasswords: false,
    },
    viewer: {
        canEditExams: false,
        canManageStudents: false,
        canViewReports: true,
        canDeleteData: false,
        canManageFinance: false,
        canManagePlans: false,
        canManageTickets: false,
        canManageBackups: false,
        canRevealPasswords: false,
    },
    support_agent: {
        canEditExams: false,
        canManageStudents: false,
        canViewReports: true,
        canDeleteData: false,
        canManageFinance: false,
        canManagePlans: false,
        canManageTickets: true,
        canManageBackups: false,
        canRevealPasswords: false,
    },
    finance_agent: {
        canEditExams: false,
        canManageStudents: false,
        canViewReports: true,
        canDeleteData: false,
        canManageFinance: true,
        canManagePlans: false,
        canManageTickets: false,
        canManageBackups: false,
        canRevealPasswords: false,
    },
    chairman: {
        canEditExams: false,
        canManageStudents: false,
        canViewReports: true,
        canDeleteData: false,
        canManageFinance: false,
        canManagePlans: false,
        canManageTickets: false,
        canManageBackups: false,
        canRevealPasswords: false,
    },
};

export function resolvePermissions(role: UserRole, requested?: Partial<IUserPermissions>): IUserPermissions {
    const base = ROLE_PERMISSION_PRESETS[role] || ROLE_PERMISSION_PRESETS.student;
    return {
        canEditExams: requested?.canEditExams ?? base.canEditExams,
        canManageStudents: requested?.canManageStudents ?? base.canManageStudents,
        canViewReports: requested?.canViewReports ?? base.canViewReports,
        canDeleteData: requested?.canDeleteData ?? base.canDeleteData,
        canManageFinance: requested?.canManageFinance ?? base.canManageFinance,
        canManagePlans: requested?.canManagePlans ?? base.canManagePlans,
        canManageTickets: requested?.canManageTickets ?? base.canManageTickets,
        canManageBackups: requested?.canManageBackups ?? base.canManageBackups,
        canRevealPasswords: requested?.canRevealPasswords ?? base.canRevealPasswords,
    };
}

export function hasPermission(
    permissions: Partial<IUserPermissions> | undefined,
    key: keyof IUserPermissions
): boolean {
    return Boolean(permissions?.[key]);
}

export function resolvePermissionsV2(role: UserRole): Partial<Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>> {
    const moduleMap = ROLE_PERMISSION_MATRIX[role] || ROLE_PERMISSION_MATRIX.student;
    const payload: Partial<Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>> = {};

    PERMISSION_MODULES.forEach((moduleName) => {
        const actionMap: Partial<Record<PermissionAction, boolean>> = {};
        PERMISSION_ACTIONS.forEach((action) => {
            actionMap[action] = moduleMap[moduleName].includes(action);
        });
        payload[moduleName] = actionMap;
    });

    return payload;
}
