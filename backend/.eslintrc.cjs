module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
  rules: {
		semi: ['error', 'never'],
		quotes: [
			'error',
			'single',
			{
				avoidEscape: true,
				allowTemplateLiterals: true,
			},
		],
		'keyword-spacing': [
			'error',
			{
				before: true, // enforce space before keywords
				after: true, // enforce space after keywords
			},
		],
		'comma-dangle': ['error', 'always-multiline'],
		'@typescript-eslint/no-inferrable-types': 'off',
		'@typescript-eslint/ban-ts-comment': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-var-requires': 'off',
		'@typescript-eslint/no-unused-vars': [
			'warn',
			{
				argsIgnorePattern: '^_',
				varsIgnorePattern: '(^log$|^_)',
				caughtErrorsIgnorePattern: '^_',
			},
		],
  },
}
