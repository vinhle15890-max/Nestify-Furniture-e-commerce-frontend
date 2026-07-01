import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // This is a plain JavaScript (JSX, no TypeScript) codebase and does not use PropTypes.
      'react/prop-types': 'off',
    },
  },
  // React Three Fiber scene files use Three.js JSX (position, rotation, args, castShadow, …)
  // that are valid R3F props but unknown to the standard react/no-unknown-property rule.
  // This override must come AFTER the general block so it takes precedence.
  {
    files: ['src/pages/roomPlanner/scene/**/*.{js,jsx}'],
    rules: {
      'react/no-unknown-property': 'off',
    },
  },
]
