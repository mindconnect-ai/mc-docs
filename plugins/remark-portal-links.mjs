// Remark plugin that adapts a project's docs to life inside the portal.
//
// The docs are written for the project's standalone site, where they are
// served at the site root. In the portal each project lives under /<id>/
// (and /<id>/<version>/ for snapshots), so absolute links need a prefix:
//
//   /img/foo.svg          -> /_assets/<id>/img/foo.svg            (current)
//                         -> /_assets/<id>/<version>/img/foo.svg  (snapshot)
//   /agents/overview      -> /<id>/agents/overview  or  /<id>/<version>/agents/overview
//   project urlRewrites   -> e.g. pathname:///editor/ -> https://…/mc-semantic-ui/editor/
//
// Relative links need nothing. Markdown links/images get Docusaurus' own
// baseUrl handling; raw JSX attributes (src/href) get baseUrl added here.

const VERSIONED = /[\\/]([^\\/]+)_versioned_docs[\\/]version-([^\\/]+)[\\/]/;

export default function remarkPortalLinks({id, urlRewrites = [], baseUrl = '/'}) {
  return (tree, file) => {
    const m = VERSIONED.exec(file.path ?? file.history?.[0] ?? '');
    const versionSeg = m && m[1] === id ? `${m[2]}/` : '';

    const rewrite = (url, isJsx) => {
      if (typeof url !== 'string' || url === '') return url;
      for (const [from, to] of urlRewrites) {
        if (url.startsWith(from)) return to + url.slice(from.length);
      }
      if (!url.startsWith('/') || url.startsWith('//')) return url;
      let out;
      if (url.startsWith('/img/')) out = `/_assets/${id}/${versionSeg}img/${url.slice(5)}`;
      else if (url.startsWith('/_assets/') || url.startsWith(`/${id}/`)) out = url;
      else out = `/${id}/${versionSeg}${url.slice(1)}`;
      return isJsx ? baseUrl.replace(/\/$/, '') + out : out;
    };

    const walk = (node) => {
      if (node.type === 'link' || node.type === 'image' || node.type === 'definition') {
        node.url = rewrite(node.url, false);
      } else if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        for (const attr of node.attributes ?? []) {
          if (attr.type === 'mdxJsxAttribute' && (attr.name === 'src' || attr.name === 'href') && typeof attr.value === 'string') {
            attr.value = rewrite(attr.value, true);
          }
        }
      }
      for (const child of node.children ?? []) walk(child);
    };
    walk(tree);
  };
}
