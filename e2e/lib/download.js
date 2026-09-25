const { assertLocalUI } = require('./scenario-safety');
const path = require('path');
const fs = require('fs');
const { test } = require('@playwright/test');
async function saveDownload(download) {
  assertLocalUI();
  const info = test.info();
  const file = info.outputPath(`${require('crypto').randomUUID()}-${path.basename(download.suggestedFilename())}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Remote browsers cannot expose their filesystem paths to the test runner.
  await download.saveAs(file);
  return file;
}
module.exports = { saveDownload };
