export const STUDENT_LOGIN = '/login';
export const CHAIRMAN_LOGIN = '/chairman/login';
export const CHAIRMAN_DASHBOARD = '/chairman/dashboard';
export const ADMIN_UI_BASE = '/__cw_admin__';
export const ADMIN_LOGIN = `${ADMIN_UI_BASE}/login`;
export const ADMIN_DASHBOARD = `${ADMIN_UI_BASE}/dashboard`;
export const ADMIN_ACCESS_DENIED = `${ADMIN_UI_BASE}/access-denied`;

export function adminUi(path: string): string {
    const normalized = String(path || '').trim().replace(/^\/+/, '');
    if (!normalized) return ADMIN_UI_BASE;
    return `${ADMIN_UI_BASE}/${normalized}`;
}

export function legacyAdminToSecret(pathname: string, search = '', hash = ''): string {
    const cleanPath = String(pathname || '').trim();
    let suffix = cleanPath;
    if (/^\/campusway-secure-admin(\/|$)/.test(cleanPath)) {
        suffix = cleanPath.replace(/^\/campusway-secure-admin\/?/, '');
    } else if (/^\/admin-dashboard(\/|$)/.test(cleanPath)) {
        suffix = cleanPath.replace(/^\/admin-dashboard\/?/, '');
    } else {
        suffix = cleanPath.replace(/^\/admin\/?/, '');
    }
    suffix = suffix.replace(/^\/+/, '');
    const target = suffix ? adminUi(suffix) : ADMIN_DASHBOARD;
    return `${target}${search || ''}${hash || ''}`;
}

type StudentManagementSubtab = 'students' | 'groups' | 'plans';

const ADMIN_TAB_ROUTE_MAP: Record<string, string> = {
    dashboard: ADMIN_DASHBOARD,
    universities: adminUi('universities'),
    featured: adminUi('featured'),
    'student-dashboard-control': adminUi('student-dashboard-control'),
    exams: adminUi('exams'),
    'live-monitor': adminUi('live-monitor'),
    'question-bank': adminUi('question-bank'),
    alerts: adminUi('alerts'),
    'student-management': adminUi('student-management/list'),
    'students-v2': adminUi('students-v2'),
    'student-groups-v2': adminUi('student-groups-v2'),
    'notification-center': adminUi('notification-center'),
    'student-settings': adminUi('settings/student-settings'),
    'subscriptions-v2': adminUi('subscriptions-v2'),
    'subscription-plans': adminUi('subscriptions/plans'),
    news: adminUi('news/pending'),
    resources: adminUi('resources'),
    banners: adminUi('settings/banner-manager'),
    'home-control': adminUi('settings/home-control'),
    contact: adminUi('contact'),
    'file-upload': adminUi('file-upload'),
    finance: adminUi('finance/dashboard'),
    'support-tickets': adminUi('support-center'),
    backups: adminUi('backups'),
    reports: adminUi('reports'),
    users: adminUi('users'),
    'admin-profile': adminUi('settings/admin-profile'),
    exports: adminUi('exports'),
    settings: adminUi('settings/site-settings'),
    'settings-center': adminUi('settings'),
    'team-access-control': adminUi('team/members'),
    security: adminUi('settings/security-center'),
    logs: adminUi('settings/system-logs'),
    password: adminUi('password'),
};

const PATH_TAB_RULES: Array<{ match: (path: string) => boolean; tab: string }> = [
    { match: (path) => path === adminUi('settings'), tab: 'settings-center' },
    { match: (path) => path.startsWith(adminUi('settings/home-control')), tab: 'home-control' },
    { match: (path) => path.startsWith(adminUi('settings/banner-manager')), tab: 'banners' },
    { match: (path) => path.startsWith(adminUi('settings/security-center')), tab: 'security' },
    { match: (path) => path.startsWith(adminUi('settings/system-logs')), tab: 'logs' },
    { match: (path) => path.startsWith(adminUi('settings/admin-profile')), tab: 'admin-profile' },
    { match: (path) => path.startsWith(adminUi('settings/site-settings')), tab: 'settings' },
    { match: (path) => path.startsWith(adminUi('settings/student-settings')), tab: 'student-settings' },
    { match: (path) => path.startsWith(adminUi('team')), tab: 'team-access-control' },
    { match: (path) => path.startsWith(adminUi('subscriptions/plans')), tab: 'subscription-plans' },
    { match: (path) => path.startsWith(adminUi('subscription-plans')), tab: 'subscription-plans' },
    { match: (path) => path.startsWith(adminUi('subscriptions-v2')), tab: 'subscriptions-v2' },
    { match: (path) => path.startsWith(adminUi('support-center')), tab: 'support-tickets' },
    { match: (path) => path.startsWith(adminUi('finance')), tab: 'finance' },
    { match: (path) => path.startsWith(adminUi('payments')), tab: 'finance' },
    { match: (path) => path.startsWith(adminUi('student-management')), tab: 'student-management' },
    { match: (path) => path.startsWith(adminUi('students-v2')), tab: 'students-v2' },
    { match: (path) => path.startsWith(adminUi('student-groups-v2')), tab: 'student-groups-v2' },
    { match: (path) => path.startsWith(adminUi('notification-center')), tab: 'notification-center' },
    { match: (path) => path.startsWith(adminUi('student-groups')), tab: 'student-management' },
    { match: (path) => path.startsWith(adminUi('students')), tab: 'student-management' },
    { match: (path) => path.startsWith(adminUi('question-bank')), tab: 'question-bank' },
    { match: (path) => path.startsWith(adminUi('live-monitor')), tab: 'live-monitor' },
    { match: (path) => path.startsWith(adminUi('student-dashboard-control')), tab: 'student-dashboard-control' },
    { match: (path) => path.startsWith(adminUi('universities')), tab: 'universities' },
    { match: (path) => path.startsWith(adminUi('featured')), tab: 'featured' },
    { match: (path) => path.startsWith(adminUi('exams')), tab: 'exams' },
    { match: (path) => path.startsWith(adminUi('alerts')), tab: 'alerts' },
    { match: (path) => path.startsWith(adminUi('news')), tab: 'news' },
    { match: (path) => path.startsWith(adminUi('resources')), tab: 'resources' },
    { match: (path) => path.startsWith(adminUi('contact')), tab: 'contact' },
    { match: (path) => path.startsWith(adminUi('file-upload')), tab: 'file-upload' },
    { match: (path) => path.startsWith(adminUi('backups')), tab: 'backups' },
    { match: (path) => path.startsWith(adminUi('users')), tab: 'users' },
    { match: (path) => path.startsWith(adminUi('exports')), tab: 'exports' },
    { match: (path) => path.startsWith(adminUi('password')), tab: 'password' },
    { match: (path) => path.startsWith(adminUi('reports')), tab: 'reports' },
    { match: (path) => path === ADMIN_DASHBOARD, tab: 'dashboard' },
];

export function adminRouteFromTab(tab: string, subtab?: StudentManagementSubtab): string {
    if (tab === 'student-management') {
        if (subtab === 'groups') return adminUi('student-management/groups');
        if (subtab === 'plans') return adminUi('subscriptions/plans');
        return adminUi('student-management/list');
    }
    return ADMIN_TAB_ROUTE_MAP[tab] || ADMIN_DASHBOARD;
}

export function adminTabFromPath(pathname: string): string {
    const cleanPath = String(pathname || '').trim();
    const rule = PATH_TAB_RULES.find((item) => item.match(cleanPath));
    return rule?.tab || 'dashboard';
}

export function adminRouteFromLegacySearch(search: string): string | null {
    const params = new URLSearchParams(search || '');
    const tab = String(params.get('tab') || '').trim();
    if (!tab) return null;
    const subtabRaw = String(params.get('subtab') || '').trim();
    const subtab = subtabRaw === 'students' || subtabRaw === 'groups' || subtabRaw === 'plans'
        ? (subtabRaw as StudentManagementSubtab)
        : undefined;
    return adminRouteFromTab(tab, subtab);
}
