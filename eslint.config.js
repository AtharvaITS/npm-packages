import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'specs/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...jsxA11y.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'jsx-a11y/no-noninteractive-tabindex': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
      'jsx-a11y/interactive-supports-focus': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/role-has-required-aria-props': 'off',
      'jsx-a11y/no-autofocus': 'off',
    },
  },
  {
    // FR-048: the Playground may only use the package's public entry point.
    files: ['apps/playground/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/packages/**', '@atharvaits/react-data-grid/src/**'],
              message: 'Import from "@atharvaits/react-data-grid" only (public entry point).',
            },
          ],
        },
      ],
    },
  },
);
