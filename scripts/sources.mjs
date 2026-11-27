// Resolves where each project's repository checkout lives.
//
// Order (first existing directory wins):
//   1. env var MC_DOCS_SRC_<ID>          e.g. MC_DOCS_SRC_SEMANTIC_UI=/path/to/mc-semantic-ui
//   2. sources.local.json                {"mindconnect": "/path/to/checkout", ...} (gitignored)
//   3. sources/<id>/                     where CI checks the repos out (gitignored)
//   4. the project's localDefault        sibling checkout on David's machine
// A path always points at the repository ROOT, not at the docs folder.

import {existsSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {projects} from '../projects.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const GENERATED = join(ROOT, '.generated');

export function envName(id) {
  return `MC_DOCS_SRC_${id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
}

function localOverrides() {
  const file = join(ROOT, 'sources.local.json');
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, 'utf8'));
}

function expandHome(p) {
  return p.startsWith('~/') ? join(process.env.HOME ?? '', p.slice(2)) : p;
}

/**
 * @returns {{project: import('../projects.mjs').Project, repoDir: string|null,
 *            docsDir: string|null, origin: string, sidebarFile: string|null,
 *            staticImgDir: string|null}}
 */
export function resolveSource(project) {
  const overrides = localOverrides();
  const candidates = [
    [process.env[envName(project.id)], `env ${envName(project.id)}`],
    [overrides[project.id], 'sources.local.json'],
    [join(ROOT, 'sources', project.id), `sources/${project.id}`],
    [project.localDefault, 'local default'],
  ];
  for (const [raw, origin] of candidates) {
    if (!raw) continue;
    const repoDir = resolve(ROOT, expandHome(raw));
    const docsDir = join(repoDir, project.docsPath);
    if (!existsSync(docsDir)) continue;
    const sidebarFile = project.sidebarPaths.map((p) => join(repoDir, p)).find(existsSync) ?? null;
    const staticImgDir = project.staticImgPaths.map((p) => join(repoDir, p)).find(existsSync) ?? null;
    return {project, repoDir, docsDir, origin, sidebarFile, staticImgDir};
  }
  return {project, repoDir: null, docsDir: null, origin: 'missing', sidebarFile: null, staticImgDir: null};
}

export function resolveAll() {
  return projects.map(resolveSource);
}
