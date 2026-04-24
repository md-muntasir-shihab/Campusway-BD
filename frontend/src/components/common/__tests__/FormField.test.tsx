import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FormField from '../FormField';
import { I18nProvider } from '@/i18n';

/* ------------------------------------------------------------------ */
/*  Helper: wraps FormField inside a real react-hook-form + I18nProvider */
/* ------------------------------------------------------------------ */

function TestForm({
    schema,
    fieldProps,
    onSubmit = () => { },
    defaultValues,
}: {
    schema: z.ZodType;
    fieldProps: Omit<
        React.ComponentProps<typeof FormField>,
        'control' | 'name'
    > & { name: string };
    onSubmit?: (data: unknown) => void;
    defaultValues?: Record<string, unknown>;
}) {
    const { control, handleSubmit } = useForm({
        resolver: zodResolver(schema),
        mode: 'onBlur',
        defaultValues: defaultValues as any,
    });

    return (
        <I18nProvider>
            <form onSubmit={handleSubmit(onSubmit)}>
                <FormField control={control} {...(fieldProps as any)} />
                <button type="submit">Submit</button>
            </form>
        </I18nProvider>
    );
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('FormField', () => {
    it('renders a text input with label', () => {
        const schema = z.object({ username: z.string() });
        render(
            <TestForm
                schema={schema}
                fieldProps={{ name: 'username', label: 'Username' }}
            />,
        );

        expect(screen.getByLabelText('Username')).toBeInTheDocument();
        expect(screen.getByLabelText('Username').tagName).toBe('INPUT');
    });

    it('renders a textarea when type is textarea', () => {
        const schema = z.object({ bio: z.string() });
        render(
            <TestForm
                schema={schema}
                fieldProps={{ name: 'bio', label: 'Bio', type: 'textarea' }}
            />,
        );

        expect(screen.getByLabelText('Bio').tagName).toBe('TEXTAREA');
    });

    it('renders a select with options', () => {
        const schema = z.object({ role: z.string() });
        render(
            <TestForm
                schema={schema}
                fieldProps={{
                    name: 'role',
                    label: 'Role',
                    type: 'select',
                    options: [
                        { value: 'admin', label: 'Admin' },
                        { value: 'user', label: 'User' },
                    ],
                }}
            />,
        );

        const select = screen.getByLabelText('Role');
        expect(select.tagName).toBe('SELECT');
        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('User')).toBeInTheDocument();
    });

    it('shows validation error on blur for required field', async () => {
        const user = userEvent.setup();
        const schema = z.object({ email: z.string().min(1, 'Required') });

        render(
            <TestForm
                schema={schema}
                fieldProps={{ name: 'email', label: 'Email', type: 'email' }}
                defaultValues={{ email: '' }}
            />,
        );

        const input = screen.getByLabelText('Email');
        await user.click(input);
        await user.tab(); // blur

        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
        });
    });

    it('displays localised error message for required field', async () => {
        const user = userEvent.setup();
        const schema = z.object({ name: z.string().min(1, 'Required') });

        render(
            <TestForm
                schema={schema}
                fieldProps={{ name: 'name', label: 'Name' }}
                defaultValues={{ name: '' }}
            />,
        );

        const input = screen.getByLabelText('Name');
        await user.click(input);
        await user.tab();

        await waitFor(() => {
            // English locale by default → "This field is required"
            expect(screen.getByRole('alert')).toHaveTextContent(
                'This field is required',
            );
        });
    });

    it('sets aria-invalid and aria-describedby on error', async () => {
        const user = userEvent.setup();
        const schema = z.object({ pw: z.string().min(1, 'Required') });

        render(
            <TestForm
                schema={schema}
                fieldProps={{ name: 'pw', label: 'Password', type: 'password' }}
                defaultValues={{ pw: '' }}
            />,
        );

        const input = screen.getByLabelText('Password');
        await user.click(input);
        await user.tab();

        await waitFor(() => {
            expect(input).toHaveAttribute('aria-invalid', 'true');
            expect(input).toHaveAttribute('aria-describedby', 'field-pw-error');
        });
    });

    it('handles number type conversion', async () => {
        const user = userEvent.setup();
        let submitted: unknown;
        const schema = z.object({ age: z.number().min(1) });

        render(
            <TestForm
                schema={schema}
                fieldProps={{ name: 'age', label: 'Age', type: 'number' }}
                defaultValues={{ age: '' }}
                onSubmit={(data) => { submitted = data; }}
            />,
        );

        const input = screen.getByLabelText('Age');
        await user.type(input, '25');
        await user.click(screen.getByText('Submit'));

        await waitFor(() => {
            expect(submitted).toEqual({ age: 25 });
        });
    });

    it('disables the input when disabled prop is true', () => {
        const schema = z.object({ field: z.string() });
        render(
            <TestForm
                schema={schema}
                fieldProps={{ name: 'field', label: 'Field', disabled: true }}
            />,
        );

        expect(screen.getByLabelText('Field')).toBeDisabled();
    });
});
