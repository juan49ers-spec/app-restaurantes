import type { ShortestConfig } from '@antiwork/shortest';

export default {
  baseUrl: 'http://localhost:3000',
  testPattern: './tests/{ai,e2e}/**/*.test.ts',
  headless: true,
  ai: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  },
} satisfies ShortestConfig;
