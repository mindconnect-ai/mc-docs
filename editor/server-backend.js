/*
 * An EditorBackend (see mc-sui-editor/backend.ts) for the server-hosted build.
 *
 * schema + default instances come from the library's REST endpoints
 * (/editor/api/schema, /editor/api/default/{type}); the page tree is loaded and
 * saved through the RestProjectStore (which hits the per-page tree endpoint).
 * One instance is bound to one project+page.
 */
export function createServerBackend({ store, projectId, pageId, base = "/editor/api" }) {
    return {
        async loadSchema() {
            const list = await fetch(`${base}/schema`, { headers: { Accept: "application/json" } })
                .then(r => { if (!r.ok) throw new Error(`schema ${r.status}`); return r.json(); });
            const map = {};
            for (const meta of list) map[meta.type] = meta;
            return map;
        },
        async loadContent() {
            return store.loadTree(projectId, pageId);
        },
        async saveContent(content) {
            await store.saveTree(projectId, pageId, content?.root ?? null);
        },
        async loadDefault(type) {
            return fetch(`${base}/default/${encodeURIComponent(type)}`, { headers: { Accept: "application/json" } })
                .then(r => { if (!r.ok) throw new Error(`default ${type} ${r.status}`); return r.json(); });
        },
    };
}
