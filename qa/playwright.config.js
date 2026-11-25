const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testMatch: 'today.spec.js',
  use: { channel: 'chrome', viewport: { width: 1160, height: 850 }, screenshot: 'only-on-failure' },
});
