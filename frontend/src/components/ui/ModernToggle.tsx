import { motion, AnimatePresence } from 'framer-motion';

interface ModernToggleProps {
    checked: boolean;
    onChange: (value: boolean) => void;
    label?: React.ReactNode;
    helper?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * A premium, animated toggle component for modern UIs.
 * Features:
 * - Smooth spring animations via framer-motion
 * - Glassmorphism effects
 * - Subtle gradients and glows
 * - Dark/Light mode ready
 */
export default function ModernToggle({
    checked,
    onChange,
    label,
    helper,
    disabled = false,
    size = 'md',
    className = '',
}: ModernToggleProps) {
    const sizes = {
        sm: { width: 44, height: 22, thumb: 16, translate: 22 },
        md: { width: 56, height: 28, thumb: 22, translate: 28 },
        lg: { width: 68, height: 34, thumb: 28, translate: 34 },
    };

    const { width, height, thumb, translate } = sizes[size];

    return (
        <label
            className={`flex items-start justify-between gap-4 cursor-pointer group select-none ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
            } ${className}`}
        >
            {label && (
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {label}
                    </span>
                    {helper && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                            {helper}
                        </span>
                    )}
                </div>
            )}
            <div className="relative flex items-center shrink-0">
                <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => !disabled && onChange(e.target.checked)}
                    disabled={disabled}
                />
                <motion.div
                    initial={false}
                    animate={{
                        backgroundColor: checked ? 'rgba(99, 102, 241, 0.2)' : 'rgba(148, 163, 184, 0.1)',
                        borderColor: checked ? 'rgba(99, 102, 241, 0.4)' : 'rgba(148, 163, 184, 0.2)',
                    }}
                    transition={{ duration: 0.3 }}
                    style={{ width, height }}
                    className="rounded-full relative border backdrop-blur-sm shadow-inner transition-colors overflow-hidden"
                >
                    {/* Inner Track Glow */}
                    <AnimatePresence>
                        {checked && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 blur-[2px]"
                            />
                        )}
                    </AnimatePresence>

                    {/* Thumb */}
                    <motion.div
                        initial={false}
                        animate={{
                            x: checked ? translate : 4,
                            backgroundColor: checked ? '#ffffff' : '#94a3b8',
                            boxShadow: checked
                                ? '0 0 15px rgba(99, 102, 241, 0.6), 0 0 5px rgba(255, 255, 255, 0.8)'
                                : '0 2px 4px rgba(0, 0, 0, 0.1)',
                        }}
                        transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 30,
                            mass: 0.8,
                        }}
                        style={{
                            width: thumb,
                            height: thumb,
                            top: (height - thumb) / 2 - 1,
                        }}
                        className="absolute rounded-full z-10"
                    >
                        {/* Subtle thumb detail */}
                        <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-transparent to-white/30" />
                    </motion.div>

                    {/* Status Labels (Optional text inside) */}
                    <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                         <span className={`text-[8px] font-bold transition-opacity duration-300 ${checked ? 'opacity-100 text-indigo-400' : 'opacity-0'}`}>
                            ON
                        </span>
                        <span className={`text-[8px] font-bold transition-opacity duration-300 ${!checked ? 'opacity-100 text-slate-500' : 'opacity-0'}`}>
                            OFF
                        </span>
                    </div>
                </motion.div>
            </div>
        </label>
    );
}
