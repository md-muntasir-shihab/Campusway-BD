import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useI18n } from '@/i18n';

export interface FormFieldProps<T extends FieldValues> {
    name: Path<T>;
    control: Control<T>;
    label: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select';
    options?: { value: string; label: string }[];
    placeholder?: string;
    disabled?: boolean;
}

const baseInputClasses =
    'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ' +
    'border-gray-300 bg-white text-gray-900 placeholder-gray-400 ' +
    'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ' +
    'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 ' +
    'dark:focus:border-blue-400 dark:focus:ring-blue-400/20 ' +
    'disabled:cursor-not-allowed disabled:opacity-50';

const errorInputClasses =
    'border-red-500 focus:border-red-500 focus:ring-red-500/20 ' +
    'dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400/20';

/**
 * Translate a react-hook-form / Zod error message through i18n.
 * If the message matches a known validation key, the localised version is returned.
 * Otherwise the raw message is passed through (covers custom Zod messages).
 */
function resolveErrorMessage(
    message: string | undefined,
    t: (key: string, params?: Record<string, string | number>) => string,
): string | undefined {
    if (!message) return undefined;

    // Map common Zod / RHF error patterns to i18n keys
    const patterns: [RegExp, string, ((m: RegExpMatchArray) => Record<string, string | number>)?][] = [
        [/^Required$/i, 'validation.required'],
        [/^Invalid email$/i, 'validation.email'],
        [/must contain at least (\d+) character/i, 'validation.minLength', (m) => ({ min: Number(m[1]) })],
        [/must contain at most (\d+) character/i, 'validation.maxLength', (m) => ({ max: Number(m[1]) })],
        [/must be greater than or equal to (\d+)/i, 'validation.min', (m) => ({ min: Number(m[1]) })],
        [/must be less than or equal to (\d+)/i, 'validation.max', (m) => ({ max: Number(m[1]) })],
        [/^Expected number/i, 'validation.invalidNumber'],
        [/^Invalid input$/i, 'validation.pattern'],
        [/^Invalid type$/i, 'validation.pattern'],
        [/^Invalid enum value/i, 'validation.pattern'],
    ];

    for (const [regex, key, paramsFn] of patterns) {
        const match = message.match(regex);
        if (match) {
            const params = paramsFn?.(match);
            return t(key, params);
        }
    }

    // If the message itself is already an i18n key (e.g. "validation.required"), translate it
    const translated = t(message);
    if (translated !== message) return translated;

    // Fallback: return the raw message (custom Zod .message() strings)
    return message;
}

export default function FormField<T extends FieldValues>({
    name,
    control,
    label,
    type = 'text',
    options,
    placeholder,
    disabled,
}: FormFieldProps<T>) {
    const { t } = useI18n();

    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState: { error } }) => {
                const errorMsg = resolveErrorMessage(error?.message, t);
                const inputId = `field-${String(name)}`;
                const errorId = `${inputId}-error`;
                const hasError = !!error;
                const classes = `${baseInputClasses} ${hasError ? errorInputClasses : ''}`;

                const sharedProps = {
                    id: inputId,
                    disabled,
                    'aria-invalid': hasError as boolean,
                    'aria-describedby': hasError ? errorId : undefined,
                };

                return (
                    <div className="flex flex-col gap-1">
                        <label
                            htmlFor={inputId}
                            className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            {label}
                        </label>

                        {type === 'textarea' ? (
                            <textarea
                                {...sharedProps}
                                className={`${classes} min-h-[80px] resize-y`}
                                placeholder={placeholder}
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                ref={field.ref}
                            />
                        ) : type === 'select' ? (
                            <select
                                {...sharedProps}
                                className={classes}
                                value={field.value ?? ''}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                ref={field.ref}
                            >
                                <option value="">
                                    {placeholder ?? t('validation.selectOption')}
                                </option>
                                {options?.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                {...sharedProps}
                                type={type}
                                className={classes}
                                placeholder={placeholder}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                    if (type === 'number') {
                                        const raw = e.target.value;
                                        field.onChange(raw === '' ? '' : Number(raw));
                                    } else {
                                        field.onChange(e.target.value);
                                    }
                                }}
                                onBlur={field.onBlur}
                                ref={field.ref}
                            />
                        )}

                        {hasError && errorMsg && (
                            <p
                                id={errorId}
                                role="alert"
                                className="text-xs text-red-600 dark:text-red-400"
                            >
                                {errorMsg}
                            </p>
                        )}
                    </div>
                );
            }}
        />
    );
}
