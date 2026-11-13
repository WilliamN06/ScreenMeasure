module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint', 'import'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  rules: {
    'import/order': ['error', { 'newlines-between': 'always' }],
    'import/no-unresolved': 'error',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    { files: ['src/renderer/**/*'], rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['electron', 'fs', 'path', 'node:*'], message: 'Renderer must not import Node/Electron APIs directly. Use preload.' }] }] } },
    { files: ['src/renderer/lib/**/*'], rules: { 'no-restricted-globals': ['error', 'document', 'window', 'navigator'] } },
  ],
};
