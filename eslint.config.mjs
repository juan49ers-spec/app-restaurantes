import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ['.next/', 'node_modules/', 'dist/', 'coverage/', 'test-bundle.js']
    },
    {
        rules: {
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            'no-undef': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            'no-constant-condition': 'off',
            'no-fallthrough': 'off',
            'no-empty': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            'no-case-declarations': 'off',
            'react-hooks/exhaustive-deps': 'off'
        }
    }
);
