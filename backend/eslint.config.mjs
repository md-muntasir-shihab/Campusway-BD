import globals from 'globals';
import tseslint from 'typescript-eslint';
import security from 'eslint-plugin-security';

export default tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
    },
    {
        files: ['**/*.ts'],
        plugins: {
            '@typescript-eslint': tseslint.plugin,
            security,
        },
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
            globals: {
                ...globals.node,
            },
        },
        rules: {
            'security/detect-eval-with-expression': 'warn',
            'security/detect-non-literal-regexp': 'warn',
            'security/detect-possible-timing-attacks': 'warn',
            'security/detect-no-csrf-before-method-override': 'warn',
        },
    }
);
