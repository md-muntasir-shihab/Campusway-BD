const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/admin/campaigns/CampaignConsolePage.tsx');
let c = fs.readFileSync(filePath, 'utf8');

// 1. Add new imports after the existing AdminGuardShell import
c = c.replace(
    "import AdminGuardShell from '../../../components/admin/AdminGuardShell';",
    "import AdminGuardShell from '../../../components/admin/AdminGuardShell';\nimport ProvidersPanel from './ProvidersPanel';\nimport SmartTriggersPanel from './SmartTriggersPanel';\nimport ExportCopyPanel from './ExportCopyPanel';"
);

// 2. Extend Tab type to include new tabs
c = c.replace(
    "type Tab = 'dashboard' | 'campaigns' | 'new' | 'templates' | 'logs' | 'settings';",
    "type Tab = 'dashboard' | 'campaigns' | 'new' | 'templates' | 'logs' | 'settings' | 'providers' | 'triggers' | 'export';"
);

// 3. Add new tab paths to CAMPAIGN_TAB_TO_PATH
c = c.replace(
    "  settings: ADMIN_PATHS.campaignsSettings,",
    "  settings: ADMIN_PATHS.campaignsSettings,\n  providers: ADMIN_PATHS.campaignsSettings + '/providers',\n  triggers: ADMIN_PATHS.campaignsSettings + '/triggers',\n  export: ADMIN_PATHS.campaignsSettings + '/export',"
);

// 4. Add new tab entries to TABS array
c = c.replace(
    "    { key: 'settings', label: 'Settings' },",
    "    { key: 'settings', label: 'Settings' },\n    { key: 'providers', label: 'Providers' },\n    { key: 'triggers', label: 'Smart Triggers' },\n    { key: 'export', label: 'Export / Copy' },"
);

// 5. Add rendering for new tabs after existing tab renders
c = c.replace(
    "      {tab === 'settings' && <SettingsPanel showToast={showToast} />}",
    "      {tab === 'settings' && <SettingsPanel showToast={showToast} />}\n      {tab === 'providers' && <ProvidersPanel showToast={showToast} />}\n      {tab === 'triggers' && <SmartTriggersPanel showToast={showToast} />}\n      {tab === 'export' && <ExportCopyPanel showToast={showToast} />}"
);

fs.writeFileSync(filePath, c, 'utf8');
console.log('CampaignConsolePage.tsx updated successfully');
