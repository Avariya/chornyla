import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'tests/output/', 'tests/snapshots/', '**/*.json'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        DOMParser: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        ArrayBuffer: 'readonly',
        Uint8Array: 'readonly',
        console: 'readonly',
      },
    },
  }
);
