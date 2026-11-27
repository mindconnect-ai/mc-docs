// @ts-check
// Central documentation portal for the mindconnect projects.
//
// One docs-plugin instance per project (see projects.mjs). The current docs of
// each instance are read straight from the project's checkout (resolved by
// scripts/sources.mjs, staged by scripts/prepare.mjs); released versions are
// archived in this repo as <id>_versioned_docs/, <id>_versioned_sidebars/ and
// <id>_versions.json.

import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {themes as prismThemes} from 'prism-react-renderer';
import {projects} from './projects.mjs';
import {GENERATED, ROOT} from './scripts/sources.mjs';
import {prepare} from './scripts/prepare.mjs';
import remarkPortalLinks from './plugins/remark-portal-links.mjs';

// Served by GitHub Pages from THIS repo: https://<owner>.github.io/<repo>/.
const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? 'mindconnect-ai/mc-docs').split('/');
const baseUrl = `/${repo}/`;

async function loadManifest() {
  const file = join(GENERATED, 'sources.json');
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  return prepare({quiet: true});
}

function readVersions(id) {
  const file = join(ROOT, `${id}_versions.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
}

export default async function createConfig() {
  const manifest = await loadManifest();

  const sections = projects.map((p) => {
    const m = manifest[p.id];
    const versions = readVersions(p.id);
    let licenseHref = p.license.href;
    if (licenseHref.startsWith('/')) licenseHref = m.hasLicensePage ? licenseHref : null;
    return {...p, ...m, versions, licenseHref};
  });

  const docsPlugins = sections.map((s) => [
    '@docusaurus/plugin-content-docs',
    /** @type {import('@docusaurus/plugin-content-docs').Options} */
    ({
      id: s.id,
      path: s.docsDir,
      routeBasePath: s.id,
      sidebarPath: s.sidebarPath,
      // "Current" is always the live docs from the project's branch; snapshots are older releases.
      lastVersion: 'current',
      versions: {current: {label: s.versions.length ? `${s.branch} (latest)` : s.branch, banner: 'none', badge: s.versions.length > 0}},
      editUrl: s.available && s.editUrlBase
        ? ({version, docPath}) => (version === 'current' ? s.editUrlBase + docPath : undefined)
        : undefined,
      beforeDefaultRemarkPlugins: [[remarkPortalLinks, {id: s.id, urlRewrites: s.urlRewrites, baseUrl}]],
    }),
  ]);

  /** @type {import('@docusaurus/types').Config} */
  const config = {
    title: 'mindconnect docs',
    tagline: 'Documentation for all mindconnect projects in one place',
    favicon: 'img/favicon.svg',

    url: `https://${owner}.github.io`,
    baseUrl,
    organizationName: owner,
    projectName: repo,
    trailingSlash: false,

    onBrokenLinks: 'warn',
    i18n: {defaultLocale: 'en', locales: ['en']},

    markdown: {
      mermaid: true,
      hooks: {onBrokenMarkdownLinks: 'warn'},
    },
    themes: ['@docusaurus/theme-mermaid'],

    // .generated/static holds each project's static/img under /_assets/<id>/img,
    // versioned_static the images archived with a snapshot.
    staticDirectories: ['static', join(GENERATED, 'static'), 'versioned_static'].filter((d) =>
      existsSync(d.startsWith('/') ? d : join(ROOT, d)),
    ),

    presets: [
      [
        'classic',
        /** @type {import('@docusaurus/preset-classic').Options} */
        ({
          docs: false,
          blog: false,
          theme: {customCss: './src/css/custom.css'},
        }),
      ],
    ],

    plugins: [...docsPlugins, ['./plugins/llms-txt.mjs', {projects: sections}]],

    customFields: {
      sections: sections.map((s) => ({
        id: s.id,
        label: s.label,
        tagline: s.tagline,
        repo: s.repo,
        private: Boolean(s.private),
        available: s.available,
        existingSite: s.existingSite ?? null,
        license: {...s.license, href: s.licenseHref},
        versions: s.versions,
      })),
    },

    themeConfig:
      /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
      ({
        colorMode: {defaultMode: 'light', respectPrefersColorScheme: true},
        navbar: {
          title: 'mindconnect docs',
          logo: {alt: 'mindconnect logo', src: 'img/logo.svg', srcDark: 'img/logo-dark.svg'},
          items: [
            ...sections.map((s) => ({
              type: 'docSidebar',
              docsPluginId: s.id,
              sidebarId: s.sidebarIds[0],
              label: s.label,
              position: /** @type {const} */ ('left'),
            })),
            // Rendered only inside its own section (see src/theme/NavbarItem/DocsVersionDropdownNavbarItem).
            ...sections
              .filter((s) => s.versions.length > 0)
              .map((s) => ({type: 'docsVersionDropdown', docsPluginId: s.id, position: /** @type {const} */ ('right')})),
            {href: 'https://github.com/mindconnect-ai', label: 'GitHub', position: 'right'},
          ],
        },
        footer: {
          style: 'dark',
          links: [
            {
              title: 'Docs',
              items: sections.map((s) => ({label: s.label, to: `/${s.id}`})),
            },
            {
              title: 'Standalone sites',
              items: sections
                .filter((s) => s.existingSite)
                .map((s) => ({label: s.label, href: s.existingSite})),
            },
            {
              title: 'Project',
              items: [
                {label: 'GitHub', href: 'https://github.com/mindconnect-ai'},
                {label: 'llms.txt', href: `pathname:///llms.txt`},
                {label: 'Support (Ko-fi)', href: 'https://ko-fi.com/beisdog'},
              ],
            },
          ],
          // The per-section license line is rendered by src/theme/Footer/Copyright.
          copyright: `Copyright © ${new Date().getFullYear()} David Beisert.`,
        },
        prism: {
          theme: prismThemes.github,
          darkTheme: prismThemes.dracula,
          additionalLanguages: ['java', 'bash', 'json', 'yaml'],
        },
      }),
  };
  return config;
}
