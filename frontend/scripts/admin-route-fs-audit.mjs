import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ADMIN_BASE = '/__cw_admin__';

function toAdminUiPath(raw) {
    const clean = String(raw || '').trim().replace(/^\/+/, '');
    return clean ? `${ADMIN_BASE}/${clean}` : ADMIN_BASE;
}

function parseArgs() {
    const args = process.argv.slice(2);
    const result = { out: '' };
    for (let i = 0; i < args.length; i += 1) {
        const token = args[i];
        if (token === '--out' && args[i + 1]) {
            result.out = String(args[i + 1]).trim();
            i += 1;
        }
    }
    return result;
}

function unique(items) {
    return Array.from(new Set(items.filter(Boolean)));
}

function collectAdminPathsFromRegistry(source) {
    const map = new Map();
    const lines = String(source || '').split(/\r?\n/);
    let inside = false;

    for (const line of lines) {
        if (!inside && line.includes('export const ADMIN_PATHS = {')) {
            inside = true;
            continue;
        }
        if (inside && line.includes('} as const;')) {
            break;
        }
        if (!inside) continue;

        const direct = line.match(/^\s*([A-Za-z0-9_]+):\s*adminUi\('([^']+)'\)\s*,?\s*$/);
        if (direct) {
            map.set(direct[1], toAdminUiPath(direct[2]));
            continue;
        }

        const dashboard = line.match(/^\s*([A-Za-z0-9_]+):\s*ADMIN_DASHBOARD\s*,?\s*$/);
        if (dashboard) {
            map.set(dashboard[1], `${ADMIN_BASE}/dashboard`);
        }
    }
    return map;
}

function resolvePathExpression(expr, adminPathsMap) {
    const value = String(expr || '').trim();
    if (!value) return null;
    if (value === 'ADMIN_DASHBOARD') return `${ADMIN_BASE}/dashboard`;
    if (value === 'ADMIN_LOGIN') return `${ADMIN_BASE}/login`;
    if (value.startsWith('ADMIN_PATHS.')) {
        const key = value.slice('ADMIN_PATHS.'.length);
        return adminPathsMap.get(key) || null;
    }
    const adminUiCall = value.match(/^adminUi\('([^']+)'\)$/);
    if (adminUiCall) return toAdminUiPath(adminUiCall[1]);
    return null;
}

function normalizeRoutePath(candidate, parentPrefix = '') {
    const raw = String(candidate || '').trim();
    if (!raw) return null;
    if (raw === '*') return null;

    if (raw.startsWith('/')) return raw;

    const parent = String(parentPrefix || '').trim().replace(/\/\*$/, '').replace(/\/+$/, '');
    if (!parent) return null;
    return `${parent}/${raw}`.replace(/\/{2,}/g, '/');
}

function collectRouteBindingsFromApp(source, adminPathsMap) {
    const lines = String(source || '').split(/\r?\n/);
    const records = [];
    const routeStack = [];

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        if (line.startsWith('</Route')) {
            if (routeStack.length) routeStack.pop();
            continue;
        }

        if (!line.startsWith('<Route ')) continue;

        const elementMatch = line.match(/element=\{\<([A-Za-z0-9_]+)/);
        const component = elementMatch ? elementMatch[1] : 'UnknownElement';

        let routePath = null;
        const literalPath = line.match(/path="([^"]+)"/);
        if (literalPath) {
            const parent = routeStack.length ? routeStack[routeStack.length - 1] : '';
            routePath = normalizeRoutePath(literalPath[1], parent);
        } else {
            const exprPath = line.match(/path=\{([^}]+)\}/);
            if (exprPath) {
                routePath = resolvePathExpression(exprPath[1], adminPathsMap);
            }
        }

        const hasNestedChildren = line.endsWith('>') && !line.endsWith('/>');
        if (hasNestedChildren) {
            const parentCandidate = String(routePath || '').trim();
            routeStack.push(parentCandidate);
        }

        if (!routePath || !routePath.startsWith(ADMIN_BASE)) continue;
        records.push({
            route: routePath,
            component,
            sourceLine: line,
        });
    }

    return records;
}

function buildRouteAudit(adminPathsMap, appBindings) {
    const canonicalRoutes = unique(Array.from(adminPathsMap.values()).filter((value) => value.startsWith(ADMIN_BASE))).sort();
    const dynamicRouteTemplates = [
        `${ADMIN_BASE}/news/editor/:id`,
        `${ADMIN_BASE}/student-management/groups/:id`,
        `${ADMIN_BASE}/student-management/students/:id`,
        `${ADMIN_BASE}/team/members/:id`,
        `${ADMIN_BASE}/team/roles/:id`,
    ];
    const canonicalWithTemplates = unique([...canonicalRoutes, ...dynamicRouteTemplates]).sort();

    const pathKeyOccurrences = new Map();
    for (const [key, route] of adminPathsMap.entries()) {
        if (!route.startsWith(ADMIN_BASE)) continue;
        const list = pathKeyOccurrences.get(route) || [];
        list.push(key);
        pathKeyOccurrences.set(route, list);
    }

    const bindingMap = new Map();
    for (const binding of appBindings) {
        const list = bindingMap.get(binding.route) || [];
        list.push(binding);
        bindingMap.set(binding.route, list);
    }

    const routes = canonicalWithTemplates.map((route) => {
        const adminPathKeys = pathKeyOccurrences.get(route) || [];
        const bindings = bindingMap.get(route) || [];
        const components = unique(bindings.map((item) => item.component));
        const hasDuplicateRegistryEntries = adminPathKeys.length > 1;
        const hasComponentConflict = components.length > 1;
        const mappedInApp = bindings.length > 0;
        return {
            route,
            adminPathKeys,
            mappedInApp,
            components,
            flags: {
                duplicateRegistryRoute: hasDuplicateRegistryEntries,
                componentConflict: hasComponentConflict,
                missingInAppRouteMap: !mappedInApp,
            },
        };
    });

    const orphanBindings = appBindings
        .filter((binding) => !canonicalWithTemplates.includes(binding.route))
        .map((binding) => ({
            route: binding.route,
            component: binding.component,
        }));

    const duplicateRegistryRoutes = Array.from(pathKeyOccurrences.entries())
        .filter(([, keys]) => keys.length > 1)
        .map(([route, keys]) => ({ route, keys }));

    const conflictingAppBindings = Array.from(bindingMap.entries())
        .map(([route, items]) => ({
            route,
            components: unique(items.map((item) => item.component)),
        }))
        .filter((item) => item.components.length > 1);

    return {
        generatedAt: new Date().toISOString(),
        adminRouteCount: canonicalWithTemplates.length,
        mappedRouteCount: routes.filter((item) => item.mappedInApp).length,
        duplicateRegistryRoutes,
        conflictingAppBindings,
        orphanBindings,
        routes,
    };
}

async function run() {
    const args = parseArgs();
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const projectRoot = path.resolve(scriptDir, '..');
    const adminPathsFile = path.resolve(projectRoot, 'src/routes/adminPaths.ts');
    const appFile = path.resolve(projectRoot, 'src/App.tsx');

    const [adminPathsSource, appSource] = await Promise.all([
        fs.readFile(adminPathsFile, 'utf-8'),
        fs.readFile(appFile, 'utf-8'),
    ]);

    const adminPathsMap = collectAdminPathsFromRegistry(adminPathsSource);
    const appBindings = collectRouteBindingsFromApp(appSource, adminPathsMap);
    const audit = buildRouteAudit(adminPathsMap, appBindings);

    if (args.out) {
        const outPath = path.resolve(args.out);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, JSON.stringify(audit, null, 2), 'utf-8');
    } else {
        process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
    }
}

run().catch((error) => {
    process.stderr.write(`[admin-route-fs-audit] failed: ${String(error?.message || error)}\n`);
    process.exitCode = 1;
});
