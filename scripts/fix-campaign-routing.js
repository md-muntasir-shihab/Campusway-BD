const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/admin/campaigns/CampaignConsolePage.tsx');
let c = fs.readFileSync(filePath, 'utf8');

// Fix 1: Change the CAMPAIGN_TAB_TO_PATH - new tabs share routes but navigateToTab 
// just stores in URL hash. Use campaignsDashboard base path for provider/triggers/export tabs
// so they don't cause 404. We'll differentiate via a hash or query param approach.
// Simplest fix: use the campaignsSettings path for all 3 new tabs, differentiated by hash.
c = c.replace(
  "  providers: ADMIN_PATHS.campaignsSettings + '/providers',\n  triggers: ADMIN_PATHS.campaignsSettings + '/triggers',\n  export: ADMIN_PATHS.campaignsSettings + '/export',",
  "  providers: ADMIN_PATHS.campaignsSettings + '#providers',\n  triggers: ADMIN_PATHS.campaignsSettings + '#triggers',\n  export: ADMIN_PATHS.campaignsSettings + '#export',"
);

// Fix 2: Override navigateToTab so hash-based tabs use location.hash matching
// and update getTabFromPath to also check location.hash
c = c.replace(
`function getTabFromPath(pathname: string): Tab {
  const normalized = String(pathname || '').trim();
  const match = (Object.entries(CAMPAIGN_TAB_TO_PATH) as Array<[Tab, string]>)
    .find(([, path]) => normalized === path);
  return match?.[0] ?? 'dashboard';
}`,
`function getTabFromPath(pathname: string, hash?: string): Tab {
  const normalized = String(pathname || '').trim();
  // Check hash-based sub-tabs first
  const h = String(hash || '').replace('#', '').toLowerCase();
  if (h === 'providers') return 'providers';
  if (h === 'triggers') return 'triggers';
  if (h === 'export') return 'export';
  const match = (Object.entries(CAMPAIGN_TAB_TO_PATH) as Array<[Tab, string]>)
    .find(([, p]) => normalized === p.split('#')[0] && !p.includes('#'));
  return match?.[0] ?? 'dashboard';
}`
);

// Fix 3: Pass location.hash to getTabFromPath
c = c.replace(
  'const tab = getTabFromPath(location.pathname);',
  'const tab = getTabFromPath(location.pathname, location.hash);'
);

// Fix 4: Fix navigateToTab for hash-based tabs to use navigate with hash
c = c.replace(
`  const navigateToTab = (nextTab: Tab) => {
    if (nextTab !== 'campaigns') setSelectedCampaignId(null);
    const nextPath = CAMPAIGN_TAB_TO_PATH[nextTab];
    if (location.pathname !== nextPath) {
      navigate(nextPath);
    }
  };`,
`  const navigateToTab = (nextTab: Tab) => {
    if (nextTab !== 'campaigns') setSelectedCampaignId(null);
    const rawPath = CAMPAIGN_TAB_TO_PATH[nextTab];
    const [pathname, hash] = rawPath.split('#');
    if (hash) {
      // Hash-based sub-tab: navigate to settings path with hash
      navigate({ pathname, hash: '#' + hash });
    } else if (location.pathname !== pathname) {
      navigate(pathname);
    }
  };`
);

// Fix 5: Improve the tab bar with group labels and visual styling
c = c.replace(
`      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => navigateToTab(t.key)}
            className={\`rounded-lg px-4 py-2 text-sm font-medium transition-colors \${tab === t.key ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}\`}
          >
            {t.label}
          </button>
        ))}
      </div>`,
`      <div className="mb-6 border-b border-slate-200 pb-3 dark:border-slate-700">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => navigateToTab(t.key)}
              className={\`rounded-lg px-3.5 py-2 text-sm font-medium transition-all \${tab === t.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}\`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>`
);

// Fix 6: Improve title and description in AdminGuardShell
c = c.replace(
  'title="Campaign Platform"',
  'title="Communication Hub"'
);
c = c.replace(
  'description="Send targeted SMS & email campaigns, manage templates, view delivery logs."',
  'description="Unified messaging center — campaigns, smart triggers, providers, audience export, and delivery logs."'
);

fs.writeFileSync(filePath, c, 'utf8');
console.log('Routing fix and UX polish applied successfully');
