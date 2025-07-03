module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    'react/no-unescaped-entities': 'off', // Allow quotes in JSX
    '@next/next/no-img-element': 'warn', // Warning instead of error for img tags
    'jsx-a11y/alt-text': 'warn' // Warning instead of error for missing alt text
  }
}
