const fs = require('fs');
const path = require('path');

// Resolve the DS2 project root and the backend checkout this suite belongs to.
//
// The suite lives at DS2_Frontend/e2e. Walking up from here, a directory is the
// DS2 root only when (a) its DS2_Frontend IS the checkout that contains this
// file — not merely some frontend checkout — and (b) DS2_Backend exists as that
// checkout's sibling. This stops a nested worktree (outer/worktrees/DS2_Frontend)
// from silently borrowing the backend, dependencies and .env.local of an
// unrelated outer checkout. Intentional alternate layouts set DS2_BACKEND_DIR
// explicitly; it must point at a backend checkout (package.json present).
const isDir = p => {
  try {
    return fs.statSync(p).isDirectory();
  } catch (_) {
    return false;
  }
};

const realpath = p => {
  try {
    return fs.realpathSync(p);
  } catch (_) {
    return path.resolve(p);
  }
};

const isInside = (child, parent) => {
  const rel = path.relative(realpath(parent), realpath(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

function findDs2Root(startDir) {
  let dir = startDir;
  while (true) {
    const frontend = path.join(dir, 'DS2_Frontend');
    const backend = path.join(dir, 'DS2_Backend');
    if (isDir(frontend) && isInside(startDir, frontend) && isDir(backend)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(
        `Could not locate the DS2 project root above ${startDir}: expected an ancestor whose DS2_Frontend contains this suite and whose DS2_Backend sits beside it. Set DS2_BACKEND_DIR to use a backend checkout elsewhere.`
      );
    }
    dir = parent;
  }
}

function resolveBackendDir(ds2Root) {
  const override = process.env.DS2_BACKEND_DIR;
  if (override) {
    const dir = path.resolve(override);
    if (!isDir(dir) || !fs.existsSync(path.join(dir, 'package.json'))) {
      throw new Error(`DS2_BACKEND_DIR=${override} is not a DS2_Backend checkout (directory with package.json)`);
    }
    return dir;
  }
  return path.join(ds2Root, 'DS2_Backend');
}

const DS2_ROOT = findDs2Root(__dirname);
const BACKEND_DIR = resolveBackendDir(DS2_ROOT);

module.exports = { DS2_ROOT, BACKEND_DIR };
