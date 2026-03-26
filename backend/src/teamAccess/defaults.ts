export const TEAM_ACTIONS = [
    'view',
    'create',
    'edit',
    'delete',
    'archive',
    'publish',
    'approve',
    'reject',
    'verify',
    'export',
    'import',
    'manage_settings',
    'manage_permissions',
    'manage_security',
    'manage_finance',
    'manage_users',
    'bulk_actions',
] as const;

export const TEAM_MODULES = [
    'dashboard',
    'home_control',
    'universities',
    'news',
    'exams',
    'question_bank',
    'students',
    'student_groups',
    'subscriptions',
    'payments',
    'resources',
    'support',
    'notifications',
    'finance',
    'help_center',
    'security_center',
    'system_logs',
    'site_settings',
    'team_access_control',
] as const;

export type TeamModule = (typeof TEAM_MODULES)[number];
export type TeamAction = (typeof TEAM_ACTIONS)[number];

export type ModulePermissions = Record<string, Record<string, boolean>>;

const allTrue = (): Record<string, boolean> =>
    TEAM_ACTIONS.reduce((acc, action) => {
        acc[action] = true;
        return acc;
    }, {} as Record<string, boolean>);

const viewOnly = (): Record<string, boolean> =>
    TEAM_ACTIONS.reduce((acc, action) => {
        acc[action] = action === 'view';
        return acc;
    }, {} as Record<string, boolean>);

const build = (enabled: Partial<Record<TeamModule, Partial<Record<TeamAction, boolean>>>>): ModulePermissions => {
    const base: ModulePermissions = {};
    TEAM_MODULES.forEach((moduleName) => {
        base[moduleName] = viewOnly();
    });
    Object.entries(enabled).forEach(([moduleName, actionMap]) => {
        base[moduleName] = { ...base[moduleName], ...(actionMap || {}) };
    });
    return base;
};

export const DEFAULT_TEAM_ROLES = [
    {
        name: 'Super Admin',
        slug: 'super-admin',
        description: 'Full access to all modules and controls.',
        isSystemRole: true,
        isActive: true,
        basePlatformRole: 'superadmin' as const,
        modulePermissions: TEAM_MODULES.reduce((acc, moduleName) => {
            acc[moduleName] = allTrue();
            return acc;
        }, {} as ModulePermissions),
    },
    {
        name: 'Admin',
        slug: 'admin',
        description: 'Broad operational access with configurable limits.',
        isSystemRole: true,
        isActive: true,
        basePlatformRole: 'admin' as const,
        modulePermissions: build({
            dashboard: { create: true, edit: true, export: true },
            home_control: { create: true, edit: true, publish: true },
            universities: { create: true, edit: true, delete: true, publish: true, export: true, import: true, bulk_actions: true },
            news: { create: true, edit: true, delete: true, publish: true, approve: true, reject: true, export: true, import: true, bulk_actions: true },
            exams: { create: true, edit: true, delete: true, publish: true, approve: true, export: true, import: true, bulk_actions: true },
            question_bank: { create: true, edit: true, delete: true, publish: true, approve: true, export: true, import: true, bulk_actions: true },
            students: { create: true, edit: true, delete: true, export: true, import: true, bulk_actions: true },
            student_groups: { create: true, edit: true, delete: true, export: true, import: true, bulk_actions: true },
            subscriptions: { create: true, edit: true, verify: true, export: true },
            payments: { create: true, edit: true, verify: true, approve: true, reject: true, export: true },
            resources: { create: true, edit: true, delete: true, publish: true, approve: true, export: true, import: true },
            support: { create: true, edit: true, approve: true },
            notifications: { create: true, edit: true, publish: true, export: true },
            finance: { view: true, edit: true, manage_finance: true, export: true, verify: true },
            help_center: { create: true, edit: true, publish: true },
            security_center: { view: true },
            system_logs: { view: true, export: true },
            site_settings: { view: true, edit: true, manage_settings: true },
            team_access_control: { view: true, create: true, edit: true, manage_users: true, manage_permissions: true, approve: true },
        }),
    },
    {
        name: 'Moderator',
        slug: 'moderator',
        description: 'Moderation workflow for operational queues.',
        isSystemRole: true,
        isActive: true,
        basePlatformRole: 'moderator' as const,
        modulePermissions: build({
            news: { create: true, edit: true, publish: true, approve: true, reject: true },
            resources: { create: true, edit: true, publish: true, approve: true, reject: true },
            support: { create: true, edit: true, approve: true, reject: true },
            students: { view: true, edit: true },
            payments: { view: true, verify: true },
        }),
    },
    { name: 'Editor', slug: 'editor', description: 'Content drafting and editing role.', isSystemRole: true, isActive: true, basePlatformRole: 'editor' as const, modulePermissions: build({ news: { create: true, edit: true, export: true }, resources: { create: true, edit: true }, universities: { edit: true }, notifications: { create: true, edit: true } }) },
    { name: 'University Manager', slug: 'university-manager', description: 'Owns university data operations.', isSystemRole: true, isActive: true, basePlatformRole: 'editor' as const, modulePermissions: build({ universities: { create: true, edit: true, delete: true, export: true, import: true, bulk_actions: true, publish: true } }) },
    { name: 'Exam Manager', slug: 'exam-manager', description: 'Manages exam lifecycle and bank.', isSystemRole: true, isActive: true, basePlatformRole: 'moderator' as const, modulePermissions: build({ exams: { create: true, edit: true, publish: true, export: true, import: true, bulk_actions: true }, question_bank: { create: true, edit: true, publish: true, approve: true, export: true, import: true } }) },
    { name: 'Student Manager', slug: 'student-manager', description: 'Manages students, groups and outreach.', isSystemRole: true, isActive: true, basePlatformRole: 'moderator' as const, modulePermissions: build({ students: { create: true, edit: true, export: true, import: true, bulk_actions: true }, student_groups: { create: true, edit: true, export: true }, subscriptions: { edit: true }, support: { view: true, edit: true } }) },
    { name: 'Finance Manager', slug: 'finance-manager', description: 'Handles finance and payment controls.', isSystemRole: true, isActive: true, basePlatformRole: 'finance_agent' as const, modulePermissions: build({ finance: { view: true, create: true, edit: true, verify: true, export: true, manage_finance: true, bulk_actions: true }, payments: { view: true, edit: true, verify: true, approve: true, reject: true, export: true }, subscriptions: { view: true, edit: true } }) },
    { name: 'Support Manager', slug: 'support-manager', description: 'Owns support desk operations.', isSystemRole: true, isActive: true, basePlatformRole: 'support_agent' as const, modulePermissions: build({ support: { view: true, create: true, edit: true, approve: true, reject: true, export: true }, students: { view: true }, help_center: { view: true, edit: true } }) },
    { name: 'Campaign Manager', slug: 'campaign-manager', description: 'Owns campaign communication pipelines.', isSystemRole: true, isActive: true, basePlatformRole: 'editor' as const, modulePermissions: build({ notifications: { view: true, create: true, edit: true, publish: true, export: true }, students: { view: true, export: true }, resources: { view: true } }) },
    { name: 'Content Reviewer', slug: 'content-reviewer', description: 'Approves/rejects editorial items.', isSystemRole: true, isActive: true, basePlatformRole: 'moderator' as const, modulePermissions: build({ news: { view: true, approve: true, reject: true }, resources: { view: true, approve: true, reject: true } }) },
    { name: 'Data Entry Operator', slug: 'data-entry-operator', description: 'Limited create/edit/import role.', isSystemRole: true, isActive: true, basePlatformRole: 'editor' as const, modulePermissions: build({ students: { view: true, create: true, edit: true, import: true }, universities: { view: true, create: true, edit: true, import: true }, resources: { view: true, create: true, edit: true } }) },
    { name: 'Viewer / Read Only', slug: 'viewer-read-only', description: 'Read-only access across allowed modules.', isSystemRole: true, isActive: true, basePlatformRole: 'viewer' as const, modulePermissions: TEAM_MODULES.reduce((acc, moduleName) => { acc[moduleName] = viewOnly(); return acc; }, {} as ModulePermissions) },
];
