type CyberToggleProps = {
    checked: boolean;
    onChange: (value: boolean) => void;
    label?: string;
    disabled?: boolean;
};

export default function CyberToggle({ checked, onChange, label, disabled = false }: CyberToggleProps) {
    return (
        <label className={`inline-flex items-center gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <span className="relative inline-flex h-8 w-[64px] items-center rounded-full border border-slate-400/40 bg-slate-900 p-1 shadow-inner transition-all duration-300 dark:border-cyan-400/20">
                <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.checked)}
                />
                <span className="absolute inset-[2px] rounded-full bg-slate-800 transition-colors duration-300 peer-checked:bg-gradient-to-r peer-checked:from-cyan-500/50 peer-checked:to-indigo-600/50" />
                <span className="relative z-10 h-6 w-6 rounded-full bg-slate-200 shadow-md transition-all duration-300 peer-checked:translate-x-8 peer-checked:bg-cyan-300" />
                <span className="pointer-events-none absolute right-2 text-[10px] font-bold uppercase tracking-wider text-cyan-300 opacity-0 transition-opacity peer-checked:opacity-100">ON</span>
                <span className="pointer-events-none absolute left-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-opacity peer-checked:opacity-0">OFF</span>
            </span>
            {label ? <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span> : null}
        </label>
    );
}
