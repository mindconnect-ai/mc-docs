#!/usr/bin/env node
// Archives a released version of one project's docs in this repo.
//
//   npm run snapshot -- <project> <version>
//   e.g. npm run snapshot -- mindconnect 1.4.0   (a leading "v" is stripped)
//
// The project's checkout (see scripts/sources.mjs) must be at the release:
// CI checks the release tag out into sources/<project>/ first; locally,
// check out the tag in your sibling checkout or point MC_DOCS_SRC_<ID> at one.
//
// What it writes (all committed):
//   <id>_versioned_docs/version-<v>/        copy of the docs folder (Docusaurus versioning)
//   <id>_versioned_sidebars/version-<v>-sidebars.json
//   <id>_versions.json                       newest first
//   versioned_static/_assets/<id>/<v>/img/  the project's static/img at that release
//   <id>_versions_meta.json                  source commit and date per version

import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {projects} from '../projects.mjs';
import {ROOT, envName} from './sources.mjs';
import {prepare} from './prepare.mjs';

function fail(msg) {
  console.error(`[snapshot] ERROR: ${msg}`);
  process.exit(1);
}

const [id, rawVersion] = process.argv.slice(2);
const project = projects.find((p) => p.id === id);
if (!project || !rawVersion) {
  fail(`usage: npm run snapshot -- <${projects.map((p) => p.id).join('|')}> <version>`);
}
const version = rawVersion.replace(/^v(?=\d)/, '');
if (!/^[0-9A-Za-z][0-9A-Za-z._-]*$/.test(version)) fail(`invalid version "${rawVersion}"`);

const versionsFile = join(ROOT, `${id}_versions.json`);
const versions = existsSync(versionsFile) ? JSON.parse(readFileSync(versionsFile, 'utf8')) : [];
if (versions.includes(version)) fail(`${id} ${version} is already archived (${id}_versions.json).`);

const manifest = await prepare();
const src = manifest[id];
if (!src.available) {
  fail(`no checkout of ${project.repo} found. Check out the release into sources/${id}/ or set ${envName(id)}.`);
}

let commit = null;
try {
  commit = execFileSync('git', ['-C', src.repoDir, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
} catch {
  // not a git checkout; fine
}
console.log(`[snapshot] ${id} ${version} from ${src.repoDir}${commit ? ` @ ${commit.slice(0, 12)}` : ''}`);

// Docusaurus' own versioning command copies the instance's docs folder and
// sidebar and updates <id>_versions.json.
execFileSync('npx', ['docusaurus', `docs:version:${id}`, version], {cwd: ROOT, stdio: 'inherit'});

// Absolute /img/ links in the snapshot are rewritten to this folder by
// plugins/remark-portal-links.mjs, so later image changes in the project do
// not alter archived versions.
const imgSrc = join(ROOT, '.generated', 'static', '_assets', id, 'img');
if (existsSync(imgSrc)) {
  cpSync(imgSrc, join(ROOT, 'versioned_static', '_assets', id, version, 'img'), {recursive: true});
}

const metaFile = join(ROOT, `${id}_versions_meta.json`);
const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
meta[version] = {repo: project.repo, commit, archivedAt: new Date().toISOString()};
writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);

console.log(`[snapshot] done. Review and commit:
  git add ${id}_versioned_docs ${id}_versioned_sidebars ${id}_versions.json ${id}_versions_meta.json versioned_static`);
