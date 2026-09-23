const path = require('path');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(__dirname, '.browsers');
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1, retries: 0,
  timeout: 90000, expect: { timeout: 15000 },
  globalSetup: require.resolve('./lib/preflight'),
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]],
  use: { baseURL: 'http://localhost:3003', headless: true, viewport: { width: 1600, height: 1100 },
    actionTimeout: 20000, navigationTimeout: 45000, screenshot: 'only-on-failure', trace: 'retain-on-failure' }
});
