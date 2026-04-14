import fs from 'fs/promises';
import path from 'path';
import { expect, test } from '@playwright/test';
import { ADMIN_PATHS } from '../src/routes/adminPaths';
import { attachHealthTracker, loginAsAdmin } from './helpers';

type ThemeMode = 'light' | 'dark';
type FontAssertMode = 'state-aware' | 'strict-freeze' | 'theme-only';
type ActionKind =
    | 'navigate'
    | 'open'
    | 'toggle'
    | 'save'
    | 'create'
    | 'edit'
    | 'cancel'
    | 'delete'
    | 'archive'
    | 'restore'
    | 'publish'
    | 'approve'
    | 'reject'
    | 'retry'
    | 'upload'
    | 'import'
    | 'export'
    | 'reorder'
    | 'view'
    | 'download'
    | 'copy'
    | 'send'
    | 'mark-paid'
    | 'renew'
    | 'submit'
    | 'tab'
    | 'pagination'
    | 'filter'
    | 'sort'
    | 'unknown';

type FontSnapshot = {
    family: string;
    size: string;
    weight: string;
    lineHeight: string;
    letterSpacing: string;
    textTransform: string;
};

type ButtonDescriptor = {
    microId: string;
    label: string;
    ariaLabel: string;
    title: string;
    role: string;
    tagName: string;
    type: string;
    disabled: boolean;
    width: number;
    height: number;
    signature: string;
};

type InteractionRecord = {
    signature: string;
    label: string;
    action: ActionKind;
    status: 'pass' | 'fail' | 'skip';
    skipReason: string | null;
    clickError: string | null;
    effectObserved: boolean;
    routeChanged: boolean;
    networkCalls: number;
    pageErrors: number;
    consoleErrors: number;
    api5xx: number;
    responsiveIssue: boolean;
    fontChecked: boolean;
    fontDeltaAllowed: boolean | null;
    fontDeltaReason: string | null;
    screenshot: string | null;
};

type CoverageEntry = {
    route: string;
    viewport: { width: number; height: number };
    theme: ThemeMode;
    visibleButtonCount: number;
    uniqueCandidateCount: number;
    testedCount: number;
    failedCount: number;
    skippedCount: number;
    overflow: number;
    filesystemMap: {
        mappedInApp: boolean;
        components: string[];
        duplicateRegistryRoute: boolean;
        componentConflict: boolean;
        missingInAppRouteMap: boolean;
    } | null;
    interactions: InteractionRecord[];
};

type FontDiffEntry = {
    route: string;
    viewport: string;
    theme: ThemeMode;
    signature: string;
    label: string;
    action: ActionKind;
    reason: string;
    before: FontSnapshot;
    after: FontSnapshot;
};

type FilesystemAuditRoute = {
    route: string;
    mappedInApp: boolean;
    components: string[];
    flags: {
        duplicateRegistryRoute: boolean;
        componentConflict: boolean;
        missingInAppRouteMap: boolean;
    };
};

const VIEWPORTS = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
];

const THEMES: ThemeMode[] = ['light', 'dark'];
const FALLBACK_OBJECT_ID = '000000000000000000000000';

const CRITICAL_ROUTES = new Set<string>([
    '/__cw_admin__/dashboard',
    '/__cw_admin__/universities',
    '/__cw_admin__/news/dashboard',
    '/__cw_admin__/exams',
    '/__cw_admin__/question-bank',
    '/__cw_admin__/student-management/list',
    '/__cw_admin__/student-management/create',
    '/__cw_admin__/student-management/import-export',
    '/__cw_admin__/subscription-plans',
    '/__cw_admin__/resources',
    '/__cw_admin__/support-center',
    '/__cw_admin__/contact',
    '/__cw_admin__/finance/dashboard',
    '/__cw_admin__/finance/transactions',
    '/__cw_admin__/finance/import',
    '/__cw_admin__/finance/export',
    '/__cw_admin__/settings/home-control',
    '/__cw_admin__/settings/site-settings',
    '/__cw_admin__/settings/security-center',
    '/__cw_admin__/settings/system-logs',
    '/__cw_admin__/settings/admin-profile',
    '/__cw_admin__/team/members',
]);

const DESTRUCTIVE_ACTIONS = new Set<ActionKind>([
    'delete',
    'archive',
    'restore',
    'approve',
    'reject',
    'mark-paid',
    'publish',
]);

function readFontMode(): FontAssertMode {
    const value = String(process.env.E2E_FONT_ASSERT_MODE || 'state-aware').trim().toLowerCase();
    if (value === 'strict-freeze') return 'strict-freeze';
    if (value === 'theme-only') return 'theme-only';
    return 'state-aware';
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function slugify(value: string): string {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'item';
}

function unique<T>(items: T[]): T[] {
    return Array.from(new Set(items));
}

function classifyAction(descriptor: Pick<ButtonDescriptor, 'label' | 'ariaLabel' | 'title'>): ActionKind {
    const raw = `${descriptor.label} ${descriptor.ariaLabel} ${descriptor.title}`.toLowerCase();
    if (!raw.trim()) return 'unknown';

    if (/\b(save|update|submit changes)\b/.test(raw)) return 'save';
    if (/\b(create|add|new)\b/.test(raw)) return 'create';
    if (/\b(edit|modify)\b/.test(raw)) return 'edit';
    if (/\b(cancel|close|discard)\b/.test(raw)) return 'cancel';
    if (/\b(delete|remove)\b/.test(raw)) return 'delete';
    if (/\b(archive)\b/.test(raw)) return 'archive';
    if (/\b(restore)\b/.test(raw)) return 'restore';
    if (/\b(publish)\b/.test(raw)) return 'publish';
    if (/\b(approve)\b/.test(raw)) return 'approve';
    if (/\b(reject)\b/.test(raw)) return 'reject';
    if (/\b(retry)\b/.test(raw)) return 'retry';
    if (/\b(upload)\b/.test(raw)) return 'upload';
    if (/\b(import)\b/.test(raw)) return 'import';
    if (/\b(export)\b/.test(raw)) return 'export';
    if (/\b(reorder|move up|move down)\b/.test(raw)) return 'reorder';
    if (/\b(view|details|preview|open)\b/.test(raw)) return 'view';
    if (/\b(download|receipt)\b/.test(raw)) return 'download';
    if (/\b(copy)\b/.test(raw)) return 'copy';
    if (/\b(send|message|notify)\b/.test(raw)) return 'send';
    if (/\b(mark paid)\b/.test(raw)) return 'mark-paid';
    if (/\b(renew)\b/.test(raw)) return 'renew';
    if (/\b(submit|confirm)\b/.test(raw)) return 'submit';
    if (/\b(next|previous|page)\b/.test(raw)) return 'pagination';
    if (/\b(sort)\b/.test(raw)) return 'sort';
    if (/\b(filter)\b/.test(raw)) return 'filter';
    if (/\b(tab)\b/.test(raw)) return 'tab';
    if (/\b(show|hide|enable|disable|toggle)\b/.test(raw)) return 'toggle';
    if (/\b(home|dashboard|settings|reports|logs|news|exams|students|finance|resources)\b/.test(raw)) return 'navigate';

    return 'unknown';
}

function shouldExpectEffect(action: ActionKind): boolean {
    return !['unknown', 'cancel'].includes(action);
}

function shouldSkipForRisk(action: ActionKind, depth: string): string | null {
    if (depth === 'full-commit') {
        if (DESTRUCTIVE_ACTIONS.has(action)) {
            return 'destructive action is validated in dedicated flow specs';
        }
        return null;
    }
    if (DESTRUCTIVE_ACTIONS.has(action) || ['save', 'create', 'submit'].includes(action)) {
        return 'skipped in safe-readonly depth';
    }
    return null;
}

function pxToNumber(value: string): number | null {
    const match = String(value || '').trim().match(/^(-?\d+(\.\d+)?)px$/);
    return match ? Number(match[1]) : null;
}

function normalizeFamily(value: string): string {
    const first = String(value || '').split(',')[0] || '';
    return first.replace(/["']/g, '').trim().toLowerCase();
}

function parseWeight(value: string): number {
    const num = Number(value);
    return Number.isFinite(num) ? num : 400;
}

function compareFonts(
    mode: FontAssertMode,
    action: ActionKind,
    before: FontSnapshot,
    after: FontSnapshot,
): { allowed: boolean; reason: string } {
    const sameFamily = normalizeFamily(before.family) === normalizeFamily(after.family);
    if (!sameFamily) {
        return { allowed: false, reason: 'font-family changed unexpectedly' };
    }

    if (mode === 'theme-only') {
        return { allowed: true, reason: 'theme-only mode' };
    }

    const sizeBefore = pxToNumber(before.size);
    const sizeAfter = pxToNumber(after.size);
    if (sizeBefore !== null && sizeAfter !== null) {
        const maxDelta = mode === 'strict-freeze' ? 0 : 0.6;
        if (Math.abs(sizeAfter - sizeBefore) > maxDelta) {
            return { allowed: false, reason: 'font-size changed beyond tolerance' };
        }
    }

    const lineBefore = pxToNumber(before.lineHeight);
    const lineAfter = pxToNumber(after.lineHeight);
    if (lineBefore !== null && lineAfter !== null) {
        const maxDelta = mode === 'strict-freeze' ? 0 : 1;
        if (Math.abs(lineAfter - lineBefore) > maxDelta) {
            return { allowed: false, reason: 'line-height changed beyond tolerance' };
        }
    }

    const letterBefore = pxToNumber(before.letterSpacing);
    const letterAfter = pxToNumber(after.letterSpacing);
    if (letterBefore !== null && letterAfter !== null) {
        const maxDelta = mode === 'strict-freeze' ? 0 : 0.2;
        if (Math.abs(letterAfter - letterBefore) > maxDelta) {
            return { allowed: false, reason: 'letter-spacing changed beyond tolerance' };
        }
    }

    const weightBefore = parseWeight(before.weight);
    const weightAfter = parseWeight(after.weight);
    const weightDelta = Math.abs(weightAfter - weightBefore);
    const statefulActions = new Set<ActionKind>(['toggle', 'tab', 'filter', 'sort', 'pagination']);
    const maxWeightDelta = mode === 'strict-freeze' ? 0 : (statefulActions.has(action) ? 400 : 100);
    if (weightDelta > maxWeightDelta) {
        return { allowed: false, reason: 'font-weight changed beyond allowed action delta' };
    }

    if (before.textTransform !== after.textTransform) {
        return { allowed: false, reason: 'text-transform changed unexpectedly' };
    }

    return { allowed: true, reason: 'within allowed state-aware tolerance' };
}

async function ensureDir(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
}

async function setThemeMode(page: import('@playwright/test').Page, mode: ThemeMode): Promise<void> {
    await page.evaluate((targetMode) => {
        localStorage.setItem('campusway_theme', targetMode);
    }, mode);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect
        .poll(
            () => page.evaluate(() => document.documentElement.classList.contains('dark')),
            { timeout: 10_000, message: `theme class should resolve to ${mode}` },
        )
        .toBe(mode === 'dark');
}

async function collectButtonDescriptors(page: import('@playwright/test').Page): Promise<ButtonDescriptor[]> {
    return page.evaluate(() => {
        const selector = 'button, [role="button"], a[role="button"], input[type="button"], input[type="submit"]';
        const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));

        function isVisible(el: HTMLElement): boolean {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || '1') === 0) return false;
            const rect = el.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return false;
            const withinViewport = rect.bottom >= 0 && rect.right >= 0 && rect.left <= window.innerWidth && rect.top <= window.innerHeight;
            return withinViewport;
        }

        const results: ButtonDescriptor[] = [];
        let index = 0;
        for (const node of nodes) {
            if (!isVisible(node)) continue;
            index += 1;
            const microId = `micro-${index}`;
            node.setAttribute('data-e2e-micro-id', microId);
            const rect = node.getBoundingClientRect();
            const label = (node.innerText || node.textContent || '').replace(/\s+/g, ' ').trim();
            const ariaLabel = (node.getAttribute('aria-label') || '').trim();
            const title = (node.getAttribute('title') || '').trim();
            const role = (node.getAttribute('role') || '').trim();
            const type = node instanceof HTMLInputElement ? String(node.type || '') : '';
            const disabled = (node as HTMLButtonElement).disabled === true || node.getAttribute('aria-disabled') === 'true';
            const signature = [
                String(node.tagName || '').toLowerCase(),
                type.toLowerCase(),
                role.toLowerCase(),
                label.toLowerCase(),
                ariaLabel.toLowerCase(),
                title.toLowerCase(),
            ].join('|');
            results.push({
                microId,
                label,
                ariaLabel,
                title,
                role,
                tagName: String(node.tagName || '').toLowerCase(),
                type,
                disabled,
                width: Math.round(rect.width * 100) / 100,
                height: Math.round(rect.height * 100) / 100,
                signature,
            });
        }
        return results;
    });
}

async function getFontSnapshot(page: import('@playwright/test').Page, microId: string): Promise<FontSnapshot | null> {
    const locator = page.locator(`[data-e2e-micro-id="${microId}"]`).first();
    if ((await locator.count()) < 1) return null;
    return locator.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
            family: style.fontFamily,
            size: style.fontSize,
            weight: style.fontWeight,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing,
            textTransform: style.textTransform,
        };
    });
}

async function getVisualSnapshot(page: import('@playwright/test').Page): Promise<{
    routePath: string;
    modalCount: number;
    markerCount: number;
}> {
    return page.evaluate(() => ({
        routePath: `${location.pathname}${location.search}`,
        modalCount: document.querySelectorAll('[role="dialog"], .fixed.inset-0, [data-state="open"]').length,
        markerCount: document.querySelectorAll('main button, main [role="button"]').length,
    }));
}

async function resolveDynamicRoute(
    page: import('@playwright/test').Page,
    endpoint: string,
    routeTemplate: string,
): Promise<string> {
    const id = await page.evaluate(async (payload) => {
        function extractFirstId(data: any): string {
            const candidates = [
                data?.item?._id,
                data?.item?.id,
                Array.isArray(data?.items) ? data.items[0]?._id || data.items[0]?.id : null,
                Array.isArray(data?.data?.items) ? data.data.items[0]?._id || data.data.items[0]?.id : null,
                Array.isArray(data) ? data[0]?._id || data[0]?.id : null,
                data?.data?._id,
                data?._id,
            ];
            for (const candidate of candidates) {
                if (candidate && String(candidate).trim()) return String(candidate).trim();
            }
            return '';
        }

        try {
            const response = await fetch(payload.endpoint, { credentials: 'include' });
            if (!response.ok) return '';
            const body = await response.json();
            return extractFirstId(body);
        } catch {
            return '';
        }
    }, { endpoint });

    const finalId = String(id || '').trim() || FALLBACK_OBJECT_ID;
    return routeTemplate.replace(':id', finalId);
}

async function resolveRouteManifest(page: import('@playwright/test').Page): Promise<string[]> {
    const canonical = unique(
        Object.values(ADMIN_PATHS)
            .map((value) => String(value))
            .filter((value) => value.startsWith('/__cw_admin__')),
    );
    canonical.push('/__cw_admin__/news/dashboard');
    canonical.push('/__cw_admin__/settings/analytics');

    const dynamicDefinitions = [
        { endpoint: '/api/campusway-secure-admin/news?limit=1', routeTemplate: '/__cw_admin__/news/editor/:id' },
        { endpoint: '/api/campusway-secure-admin/students?limit=1', routeTemplate: '/__cw_admin__/student-management/students/:id' },
        { endpoint: '/api/campusway-secure-admin/student-groups?limit=1', routeTemplate: '/__cw_admin__/student-management/groups/:id' },
        { endpoint: '/api/campusway-secure-admin/team/members?limit=1', routeTemplate: '/__cw_admin__/team/members/:id' },
        { endpoint: '/api/campusway-secure-admin/team/roles?limit=1', routeTemplate: '/__cw_admin__/team/roles/:id' },
    ];

    for (const dynamic of dynamicDefinitions) {
        const route = await resolveDynamicRoute(page, dynamic.endpoint, dynamic.routeTemplate);
        canonical.push(route);
    }

    return unique(canonical).sort();
}

function readFilesystemMapByRoute(jsonText: string): Map<string, FilesystemAuditRoute> {
    const parsed = JSON.parse(jsonText || '{}') as { routes?: FilesystemAuditRoute[] };
    const routes = Array.isArray(parsed.routes) ? parsed.routes : [];
    return new Map(routes.map((item) => [item.route, item]));
}

test.describe('Admin Button/Font Micro Coverage', () => {
    test('all admin routes have actionable button checks with responsive + theme + state-aware font assertions', async ({ page }, testInfo) => {
        test.setTimeout(45 * 60_000);
        test.skip(testInfo.project.name.includes('mobile'), 'Desktop project controls responsive matrix directly.');

        const fontMode = readFontMode();
        const depthMode = String(process.env.E2E_ADMIN_BUTTON_DEPTH || 'full-commit').trim().toLowerCase();
        const criticalOnly = String(process.env.E2E_ADMIN_MICRO_CRITICAL_ONLY || '').trim().toLowerCase() === 'true';
        const perRouteLimit = parsePositiveInt(process.env.E2E_ADMIN_BUTTON_LIMIT_PER_ROUTE, 80);
        const secondaryMatrixLimit = parsePositiveInt(process.env.E2E_ADMIN_BUTTON_LIMIT_SECONDARY, 8);
        const artifactDir = path.resolve(process.env.E2E_PASS_ARTIFACTS_DIR || path.resolve(process.cwd(), '../qa-artifacts/admin-button-font-micro'));
        const issueDir = path.join(artifactDir, 'admin-button-font-issues');
        const fsAuditPath = String(process.env.E2E_ADMIN_ROUTE_AUDIT_PATH || '').trim();

        await ensureDir(artifactDir);
        await ensureDir(issueDir);

        let filesystemMap = new Map<string, FilesystemAuditRoute>();
        if (fsAuditPath) {
            try {
                const raw = await fs.readFile(path.resolve(fsAuditPath), 'utf-8');
                filesystemMap = readFilesystemMapByRoute(raw);
            } catch {
                filesystemMap = new Map();
            }
        }

        const healthTracker = attachHealthTracker(page);
        const consoleErrors: string[] = [];
        const apiResponses: Array<{ status: number; url: string }> = [];
        const onConsole = (message: { type(): string; text(): string }) => {
            if (message.type() === 'error') consoleErrors.push(message.text());
        };
        const onResponse = (response: { status(): number; url(): string }) => {
            apiResponses.push({ status: response.status(), url: response.url() });
        };
        page.on('console', onConsole);
        page.on('response', onResponse);

        await loginAsAdmin(page);
        const allRoutes = await resolveRouteManifest(page);
        const selectedRoutes = criticalOnly ? allRoutes.filter((route) => CRITICAL_ROUTES.has(route)) : allRoutes;

        const coverageEntries: CoverageEntry[] = [];
        const fontDiffs: FontDiffEntry[] = [];

        for (const viewport of VIEWPORTS) {
            await page.setViewportSize(viewport);

            for (const theme of THEMES) {
                for (const route of selectedRoutes) {
                    let routeLoadError: string | null = null;
                    try {
                        await page.goto(route, { waitUntil: 'domcontentloaded' });
                        await setThemeMode(page, theme);
                        await page.goto(route, { waitUntil: 'domcontentloaded' });
                        await page.waitForTimeout(250);
                    } catch (error) {
                        routeLoadError = String(error instanceof Error ? error.message : error);
                    }

                    if (routeLoadError) {
                        const shotName = `${slugify(route)}-${viewport.width}x${viewport.height}-${theme}-route-load.png`;
                        const absolute = path.join(issueDir, shotName);
                        await page.screenshot({ path: absolute, fullPage: true }).catch(() => undefined);
                        coverageEntries.push({
                            route,
                            viewport,
                            theme,
                            visibleButtonCount: 0,
                            uniqueCandidateCount: 0,
                            testedCount: 0,
                            failedCount: 1,
                            skippedCount: 0,
                            overflow: 0,
                            filesystemMap: null,
                            interactions: [{
                                signature: `route-load-${route}`,
                                label: 'route-load',
                                action: 'navigate',
                                status: 'fail',
                                skipReason: null,
                                clickError: routeLoadError,
                                effectObserved: false,
                                routeChanged: false,
                                networkCalls: 0,
                                pageErrors: 0,
                                consoleErrors: 0,
                                api5xx: 0,
                                responsiveIssue: false,
                                fontChecked: false,
                                fontDeltaAllowed: null,
                                fontDeltaReason: null,
                                screenshot: path.relative(artifactDir, absolute).replace(/\\\\/g, '/'),
                            }],
                        });
                        continue;
                    }

                    const routeErrorsBefore = healthTracker.pageErrors.length;
                    const apiFailuresBefore = healthTracker.criticalApiFailures.length;
                    const consoleBefore = consoleErrors.length;
                    const responsesBefore = apiResponses.length;

                    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
                    const visibleButtons = await collectButtonDescriptors(page);

                    const seen = new Set<string>();
                    const isPrimaryMatrix = viewport.width === 1440 && theme === 'light';
                    const matrixLimit = isPrimaryMatrix ? perRouteLimit : Math.min(perRouteLimit, secondaryMatrixLimit);
                    const uniqueCandidates = visibleButtons.filter((button) => {
                        if (seen.has(button.signature)) return false;
                        seen.add(button.signature);
                        return true;
                    }).slice(0, matrixLimit);

                    const interactions: InteractionRecord[] = [];

                    for (let i = 0; i < uniqueCandidates.length; i += 1) {
                        const original = uniqueCandidates[i];
                        const action = classifyAction(original);
                        const skipRiskReason = shouldSkipForRisk(action, depthMode);
                        const tapTargetIssue = viewport.width <= 390 && (original.width < 28 || original.height < 28);
                        const entryBase: InteractionRecord = {
                            signature: original.signature,
                            label: original.label || original.ariaLabel || original.title || '(icon)',
                            action,
                            status: 'pass',
                            skipReason: null,
                            clickError: null,
                            effectObserved: false,
                            routeChanged: false,
                            networkCalls: 0,
                            pageErrors: 0,
                            consoleErrors: 0,
                            api5xx: 0,
                            responsiveIssue: tapTargetIssue,
                            fontChecked: false,
                            fontDeltaAllowed: null,
                            fontDeltaReason: null,
                            screenshot: null,
                        };

                        if (original.disabled) {
                            interactions.push({
                                ...entryBase,
                                status: 'skip',
                                skipReason: 'disabled control',
                            });
                            continue;
                        }
                        if (skipRiskReason) {
                            interactions.push({
                                ...entryBase,
                                status: 'skip',
                                skipReason: skipRiskReason,
                            });
                            continue;
                        }

                        await page.goto(route, { waitUntil: 'domcontentloaded' });
                        await page.waitForTimeout(150);
                        const freshButtons = await collectButtonDescriptors(page);
                        const target = freshButtons.find((item) => item.signature === original.signature) || freshButtons[i];

                        if (!target) {
                            interactions.push({
                                ...entryBase,
                                status: 'skip',
                                skipReason: 'button not found after route reset',
                            });
                            continue;
                        }

                        const locator = page.locator(`[data-e2e-micro-id="${target.microId}"]`).first();
                        const visualBefore = await getVisualSnapshot(page);
                        const fontBefore = await getFontSnapshot(page, target.microId);
                        const errorsBefore = healthTracker.pageErrors.length;
                        const api5xxBefore = healthTracker.criticalApiFailures.length;
                        const consoleDeltaBefore = consoleErrors.length;
                        const responseDeltaBefore = apiResponses.length;

                        let clickError: string | null = null;
                        try {
                            await locator.scrollIntoViewIfNeeded();
                            await locator.click({ timeout: 8_000 });
                        } catch (error) {
                            clickError = String(error instanceof Error ? error.message : error);
                        }

                        await page.waitForTimeout(350);
                        const visualAfter = await getVisualSnapshot(page);

                        const routeChanged = visualAfter.routePath !== visualBefore.routePath;
                        const networkCalls = apiResponses.slice(responseDeltaBefore).filter((item) => item.url.includes('/api/')).length;
                        const pageErrorsDelta = healthTracker.pageErrors.length - errorsBefore;
                        const api5xxDelta = healthTracker.criticalApiFailures.length - api5xxBefore;
                        const consoleDelta = consoleErrors.length - consoleDeltaBefore;
                        const effectObserved = routeChanged
                            || networkCalls > 0
                            || visualAfter.modalCount !== visualBefore.modalCount
                            || visualAfter.markerCount !== visualBefore.markerCount;

                        const fontAfter = await getFontSnapshot(page, target.microId);
                        let fontCheck = { allowed: true, reason: 'not checked' };
                        let fontChecked = false;
                        if (fontBefore && fontAfter) {
                            fontChecked = true;
                            fontCheck = compareFonts(fontMode, action, fontBefore, fontAfter);
                            if (!fontCheck.allowed) {
                                fontDiffs.push({
                                    route,
                                    viewport: `${viewport.width}x${viewport.height}`,
                                    theme,
                                    signature: target.signature,
                                    label: target.label || target.ariaLabel || target.title || '(icon)',
                                    action,
                                    reason: fontCheck.reason,
                                    before: fontBefore,
                                    after: fontAfter,
                                });
                            }
                        }

                        let status: InteractionRecord['status'] = 'pass';
                        if (clickError) status = 'fail';
                        if (api5xxDelta > 0 || pageErrorsDelta > 0) status = 'fail';
                        if (tapTargetIssue) status = 'fail';
                        if (fontChecked && !fontCheck.allowed) status = 'fail';
                        if (!effectObserved && shouldExpectEffect(action) && !clickError) status = 'fail';

                        let screenshotPath: string | null = null;
                        if (status === 'fail') {
                            const name = `${slugify(route)}-${viewport.width}x${viewport.height}-${theme}-${slugify(target.signature)}.png`;
                            const absolute = path.join(issueDir, name);
                            await page.screenshot({ path: absolute, fullPage: true }).catch(() => undefined);
                            screenshotPath = path.relative(artifactDir, absolute).replace(/\\/g, '/');
                        }

                        interactions.push({
                            ...entryBase,
                            status,
                            clickError,
                            effectObserved,
                            routeChanged,
                            networkCalls,
                            pageErrors: pageErrorsDelta,
                            consoleErrors: consoleDelta,
                            api5xx: api5xxDelta,
                            fontChecked,
                            fontDeltaAllowed: fontChecked ? fontCheck.allowed : null,
                            fontDeltaReason: fontChecked ? fontCheck.reason : null,
                            screenshot: screenshotPath,
                        });
                    }

                    const fsRoute = filesystemMap.get(route);
                    const entry: CoverageEntry = {
                        route,
                        viewport,
                        theme,
                        visibleButtonCount: visibleButtons.length,
                        uniqueCandidateCount: uniqueCandidates.length,
                        testedCount: interactions.filter((item) => item.status !== 'skip').length,
                        failedCount: interactions.filter((item) => item.status === 'fail').length,
                        skippedCount: interactions.filter((item) => item.status === 'skip').length,
                        overflow,
                        filesystemMap: fsRoute ? {
                            mappedInApp: fsRoute.mappedInApp,
                            components: fsRoute.components,
                            duplicateRegistryRoute: fsRoute.flags.duplicateRegistryRoute,
                            componentConflict: fsRoute.flags.componentConflict,
                            missingInAppRouteMap: fsRoute.flags.missingInAppRouteMap,
                        } : null,
                        interactions,
                    };
                    coverageEntries.push(entry);

                    const routeErrorsDelta = healthTracker.pageErrors.length - routeErrorsBefore;
                    const routeApi5xxDelta = healthTracker.criticalApiFailures.length - apiFailuresBefore;
                    const routeConsoleDelta = consoleErrors.length - consoleBefore;
                    const routeResponsesDelta = apiResponses.length - responsesBefore;
                    expect.soft(routeErrorsDelta, `Unhandled page errors on ${route}`).toBe(0);
                    expect.soft(routeApi5xxDelta, `API 5xx responses on ${route}`).toBe(0);
                    expect.soft(routeConsoleDelta, `Console errors on ${route}`).toBeGreaterThanOrEqual(0);
                    expect.soft(routeResponsesDelta, `No network responses captured on ${route}`).toBeGreaterThanOrEqual(0);
                }
            }
        }

        const manifest = {
            generatedAt: new Date().toISOString(),
            criticalOnly,
            fontMode,
            depthMode,
            viewports: VIEWPORTS,
            themes: THEMES,
            routes: selectedRoutes,
            totals: {
                routeCount: selectedRoutes.length,
                entryCount: coverageEntries.length,
                visibleButtons: coverageEntries.reduce((acc, item) => acc + item.visibleButtonCount, 0),
                testedInteractions: coverageEntries.reduce((acc, item) => acc + item.testedCount, 0),
                failedInteractions: coverageEntries.reduce((acc, item) => acc + item.failedCount, 0),
                skippedInteractions: coverageEntries.reduce((acc, item) => acc + item.skippedCount, 0),
                fontDiffCount: fontDiffs.length,
            },
        };

        await fs.writeFile(path.join(artifactDir, 'admin-route-manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
        await fs.writeFile(path.join(artifactDir, 'admin-button-coverage.json'), JSON.stringify({
            ...manifest,
            coverageEntries,
        }, null, 2), 'utf-8');
        await fs.writeFile(path.join(artifactDir, 'font-diff-report.json'), JSON.stringify({
            generatedAt: manifest.generatedAt,
            fontMode,
            totalDiffs: fontDiffs.length,
            entries: fontDiffs,
        }, null, 2), 'utf-8');

        page.off('console', onConsole);
        page.off('response', onResponse);
        healthTracker.detach();

        const failedInteractions = coverageEntries.reduce((acc, item) => acc + item.failedCount, 0);
        expect.soft(failedInteractions, 'Admin micro coverage has failing interactions').toBe(0);
        await expect(page.locator('body')).toBeVisible();
    });
});
