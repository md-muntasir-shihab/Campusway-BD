const fs = require('fs');
const file = 'src/components/admin/finance/FinanceDashboardPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Header
content = content.replace(
    'className="flex flex-wrap items-center justify-between gap-3"',
    'className="flex flex-col flex-wrap justify-between gap-4 rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-slate-100/50 p-6 shadow-sm dark:border-slate-800/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:flex-row sm:items-center"'
);
content = content.replace(
    'className="text-xl font-bold text-slate-800 dark:text-white"',
    'className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-2xl font-black tracking-tight text-transparent dark:from-white dark:to-slate-300"'
);
content = content.replace(
    'className="text-xs text-slate-500 dark:text-slate-400"',
    'className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400"'
);

// KpiCard
content = content.replace(
    /function KpiCard\(\{\s*icon,\s*label,\s*value,\s*color,\s*sub,\s*change\s*\}\s*:\s*\{[\s\S]*?\}\)\s*\{[\s\S]*?const colors: Record<string, \{ bg: string; text: string; icon: string \}> = \{[\s\S]*?\};\s*const c = colors\[color\] \?\? colors\.blue;/,
    `function KpiCard({ icon, label, value, color, sub, change }: {
    icon: React.ReactNode; label: string; value: string; color: string; sub?: string; change?: number;
}) {
    const colors: Record<string, { ring: string; bg: string; text: string; iconBg: string; icon: string }> = {
        green: { ring: 'hover:ring-green-500/30 dark:hover:ring-green-400/30', bg: 'bg-gradient-to-br from-green-50 to-white dark:from-green-950/40 dark:to-slate-900', text: 'text-green-700 dark:text-green-400', iconBg: 'bg-green-100 dark:bg-green-900/50', icon: 'text-green-600 dark:text-green-400' },
        red: { ring: 'hover:ring-red-500/30 dark:hover:ring-red-400/30', bg: 'bg-gradient-to-br from-red-50 to-white dark:from-red-950/40 dark:to-slate-900', text: 'text-red-700 dark:text-red-400', iconBg: 'bg-red-100 dark:bg-red-900/50', icon: 'text-red-600 dark:text-red-400' },
        amber: { ring: 'hover:ring-amber-500/30 dark:hover:ring-amber-400/30', bg: 'bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-900', text: 'text-amber-700 dark:text-amber-400', iconBg: 'bg-amber-100 dark:bg-amber-900/50', icon: 'text-amber-600 dark:text-amber-400' },
        orange: { ring: 'hover:ring-orange-500/30 dark:hover:ring-orange-400/30', bg: 'bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/40 dark:to-slate-900', text: 'text-orange-700 dark:text-orange-400', iconBg: 'bg-orange-100 dark:bg-orange-900/50', icon: 'text-orange-600 dark:text-orange-400' },
        purple: { ring: 'hover:ring-purple-500/30 dark:hover:ring-purple-400/30', bg: 'bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/40 dark:to-slate-900', text: 'text-purple-700 dark:text-purple-400', iconBg: 'bg-purple-100 dark:bg-purple-900/50', icon: 'text-purple-600 dark:text-purple-400' },
        blue: { ring: 'hover:ring-blue-500/30 dark:hover:ring-blue-400/30', bg: 'bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/40 dark:to-slate-900', text: 'text-blue-700 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-900/50', icon: 'text-blue-600 dark:text-blue-400' },
    };
    const c = colors[color] ?? colors.blue;`
);

content = content.replace(
    /<div className=\{\`rounded-xl border border-slate-200 \$\{c\.bg\} p-3 dark:border-slate-700\`\}>/,
    `<div className={\`group relative overflow-hidden rounded-[1.5rem] border border-slate-200/60 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-2 \${c.ring} \${c.bg} dark:border-slate-800/60\`}>
            <div className={\`absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-[0.03] duration-500 group-hover:scale-150 \${c.text} bg-current dark:opacity-5 transition-transform\`} />`
);
content = content.replace(
    /<div className=\{\`mb-1 \$\{c\.icon\}\`\}>\{icon\}<\/div>/,
    `<div className={\`mb-4 flex h-12 w-12 items-center justify-center rounded-[1rem] \${c.iconBg} \${c.icon} shadow-inner\`}>{icon}</div>
            <div className="relative z-10">`
);
content = content.replace(
    /<p className="text-\[10px\] font-medium text-slate-500 dark:text-slate-400">\{label\}<\/p>/,
    `<p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>`
);
content = content.replace(
    /<p className=\{\`text-lg font-bold \$\{c\.text\}\`\}>\{value\}<\/p>/,
    `<p className={\`mt-1 text-3xl font-black tracking-tight \${c.text}\`}>{value}</p>`
);
content = content.replace(
    /\{sub && <p className="text-\[10px\] text-slate-500 dark:text-slate-400">\{sub\}<\/p>\}/,
    `{sub && <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{sub}</p>}`
);
content = content.replace(
    /<div className=\{\`mt-1 flex items-center gap-0\.5 text-\[10px\] font-medium \$\{change > 0 \? 'text-green-600' : 'text-red-600'\}\`\}>\s*\{change > 0 \? <ArrowUpRight size=\{10\} \/> : <ArrowDownRight size=\{10\} \/>\}\s*\{Math\.abs\(change\)\.toFixed\(1\)\}% vs prev month\s*<\/div>/,
    `<div className={\`mt-3 flex items-center gap-1 text-[11px] font-bold \${change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}\`}>
                        {change > 0 ? <ArrowUpRight strokeWidth={3} size={14} /> : <ArrowDownRight strokeWidth={3} size={14} />}
                        {Math.abs(change).toFixed(1)}% <span className="font-medium text-slate-400 dark:text-slate-500">vs prev</span>
                    </div>`
);

// close the div
content = content.replace(
    /(\s*)\}\s*<\/div>\s*\);\s*\}/,
    `$1}
            </div>
        </div>
    );
}`
);


// SecondaryKpi
content = content.replace(
    /<div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">/,
    `<div className="flex items-center gap-4 rounded-[1.5rem] border border-slate-200/60 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/50">`
);
content = content.replace(
    /<div className="text-indigo-500">\{icon\}<\/div>/,
    `<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-indigo-50 text-indigo-600 shadow-inner dark:bg-indigo-950/40 dark:text-indigo-400">{icon}</div>`
);
content = content.replace(
    /<p className="text-\[10px\] text-slate-500 dark:text-slate-400">\{label\}<\/p>\s*<p className="text-sm font-bold text-slate-800 dark:text-white">\{value\}<\/p>/,
    `<p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-0.5 text-xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>`
);

// Income vs Expense Trend Box
content = content.replace(
    /<div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">/,
    `<div className="rounded-[1.5rem] border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60">`
);

fs.writeFileSync(file, content);
console.log('Replaced successfully');
