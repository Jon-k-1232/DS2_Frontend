const fs = require('fs');
const path = require('path');

// Resolve the DS2 project root regardless of where this e2e suite is checked
// out (DS2_Frontend/e2e today; previously a sibling of DS2_Backend and
// DS2_Frontend outside both repos). Walk up from this file until a directory
// containing both DS2_Backend and DS2_Frontend is found.
function findDs2Root(startDir) {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, 'DS2_Backend')) && fs.existsSync(path.join(dir, 'DS2_Frontend'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`Could not locate the DS2 project root (a directory containing both DS2_Backend and DS2_Frontend) above ${startDir}`);
    dir = parent;
  }
}

const DS2_ROOT = findDs2Root(__dirname);
const BACKEND_DIR = path.join(DS2_ROOT, 'DS2_Backend');

module.exports = { DS2_ROOT, BACKEND_DIR };
