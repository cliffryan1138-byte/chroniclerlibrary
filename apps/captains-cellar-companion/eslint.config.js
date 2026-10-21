import tseslint from 'typescript-eslint'

// The three-layer rule: core/ (the SPARK engine) must never reach into a branch or an app config.
// tests/architecture.test.ts enforces the same rule, so it holds even if nobody runs lint.
export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/branches/**', '**/branches'], message: 'core/ must not import from branches/.' },
          { group: ['**/config/**', '**/config'], message: 'core/ must not import from config/.' },
          { group: ['**/app/**', 'react', 'react-dom', '@supabase/*'], message: 'core/ is pure logic: no UI, no data layer.' },
        ],
      }],
    },
  },
)
