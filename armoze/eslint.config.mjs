import studio from '@sanity/eslint-config-studio'

const nodeGlobals = {
  Buffer: 'readonly',
  console: 'readonly',
  process: 'readonly',
  setTimeout: 'readonly',
}

export default [
  ...studio,
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: nodeGlobals,
    },
  },
]
