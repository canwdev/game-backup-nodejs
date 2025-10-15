import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: {
    tsconfigPath: 'tsconfig.json',
  },
  rules: {
    'no-console': 'off',
    'ts/no-unsafe-call': 'off',
    'ts/no-floating-promises': 'off',
    'ts/strict-boolean-expressions': 'off',
    'ts/no-unsafe-member-access': 'off',
    'ts/no-unsafe-argument': 'warn',
    'ts/no-unsafe-assignment': 'warn',
    'ts/ban-ts-comment': 'off',
  },
})
