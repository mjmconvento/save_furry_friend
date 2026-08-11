import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['build', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // HMR granularity only, not correctness. Each provider deliberately
      // co-locates its own hook (`AuthProvider`/`useAuth`,
      // `ToastProvider`/`useNotify`) — the conventional React shape, and the
      // one the frontend review's own fix prescribes. Splitting them would be
      // churn for zero behavioural gain.
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, allowExportNames: ['useAuth', 'useNotify'] },
      ],
      // The three the review calls out as hiding real defects, promoted from
      // warnings nobody read to errors that fail the build.
      eqeqeq: ['error', 'always'],
      'react-hooks/exhaustive-deps': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  }
);
