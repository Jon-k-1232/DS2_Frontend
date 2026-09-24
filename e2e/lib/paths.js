const fs = require('fs');
const path = require('path');

// Resolve the backend checkout this suite belongs to.
//
// The suite lives at DS2_Frontend/e2e. Its own frontend checkout is the nearest
// ancestor named DS2_Frontend; the backend is that checkout's sibling
// DS2_Backend — never some other checkout's — unless DS2_BACKEND_DIR names one
// explicitly (validated: it must contain package.json). A nested worktree
// (outer/worktrees/DS2_Frontend) therefore fails clearly instead of borrowing
// outer/DS2_Backend's dependencies and .env.local, and the override can rescue
// it because the frontend is located before any backend is required.
const isDir = p => {
  try {
    return fs.statSync(p).isDirectory();
  } catch (_) {
    return false;
  }
};

// The frontend checkout that contains this suite: the nearest ancestor directory
// named DS2_Frontend. Found first and independently of any backend, so that the
// DS2_BACKEND_DIR override can be honoured even when no sibling backend exists.
function findFrontendRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (path.basename(dir) === 'DS2_Frontend') return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`This suite must live inside a DS2_Frontend checkout (looked upward from ${startDir}).`);
    dir = parent;
  }
}

function resolveBackendDir(frontendRoot) {
  const override = process.env.DS2_BACKEND_DIR;
  if (override) {
    const dir = path.resolve(override);
    if (!isDir(dir) || !fs.existsSync(path.join(dir, 'package.json'))) {
      throw new Error(`DS2_BACKEND_DIR=${override} is not a DS2_Backend checkout (directory with package.json)`);
    }
    return dir;
  }
  const sibling = path.join(path.dirname(frontendRoot), 'DS2_Backend');
  if (!isDir(sibling)) {
    throw new Error(
      `No DS2_Backend beside ${frontendRoot}. This suite uses the backend checkout that sits next to its own frontend checkout; for another layout set DS2_BACKEND_DIR=/path/to/DS2_Backend.`
    );
  }
  return sibling;
}

const FRONTEND_ROOT = findFrontendRoot(__dirname);
const BACKEND_DIR = resolveBackendDir(FRONTEND_ROOT);
// The project root is the backend's parent (equal to the frontend's parent in the
// standard layout); kept for callers that build paths from it.
const DS2_ROOT = path.dirname(BACKEND_DIR);

module.exports = { DS2_ROOT, BACKEND_DIR, FRONTEND_ROOT };
