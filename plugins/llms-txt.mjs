// Writes build/llms.txt (https://llmstxt.org): one section per project with
// every page of its current docs, plus a list of archived versions.

import {writeFileSync} from 'node:fs';
import {join} from 'node:path';

// Docusaurus derives a description from the first paragraph; drop the ones
// that are table rows or front-matter fragments, and keep the rest short.
function describe(raw) {
  const text = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!text || /^[|\-#`]/.test(text)) return '';
  return `: ${text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text}`;
}

export default function llmsTxtPlugin(context, {projects}) {
  let docsByPlugin = {};
  return {
    name: 'mc-llms-txt',
    async allContentLoaded({allContent}) {
      docsByPlugin = allContent['docusaurus-plugin-content-docs'] ?? {};
    },
    async postBuild({outDir, siteConfig}) {
      const site = siteConfig.url.replace(/\/$/, '');
      const abs = (permalink) => site + permalink;
      const lines = [
        `# ${siteConfig.title}`,
        '',
        `> ${siteConfig.tagline}`,
        '',
        'Central documentation portal for the mindconnect projects. Each project\'s current docs come from its own repository; released versions are archived here.',
        '',
      ];
      for (const p of projects) {
        const content = docsByPlugin[p.id];
        if (!content) continue;
        const versions = content.loadedVersions ?? [];
        const current = versions.find((v) => v.versionName === 'current') ?? versions[0];
        const source = p.private ? '' : ` Source: https://github.com/${p.repo}`;
        lines.push(`## ${p.label}`, '', `${p.tagline} License: ${p.license.name}.${source}`, '');
        for (const doc of current?.docs ?? []) {
          lines.push(`- [${doc.title}](${abs(doc.permalink)})${describe(doc.description)}`);
        }
        const archived = versions.filter((v) => v.versionName !== 'current');
        if (archived.length) {
          lines.push('', `### ${p.label}: archived versions`, '');
          for (const v of archived) lines.push(`- [${v.label}](${abs(v.path)})`);
        }
        lines.push('');
      }
      writeFileSync(join(outDir, 'llms.txt'), lines.join('\n'));
    },
  };
}
