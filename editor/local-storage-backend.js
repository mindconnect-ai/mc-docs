/*
 * A backend-free {@code EditorBackend} (see mc-sui-editor/backend.ts).
 *
 * The Spring-hosted editor talks to /editor/api/*; this stand-in serves the
 * exact same four operations from local data:
 *   - loadSchema  → the bundled node catalogue (data/schema.json)
 *   - loadDefault → a clone of a bundled default (data/defaults.json), re-id'd
 *   - loadContent → the page's tree from localStorage (via ProjectStore)
 *   - saveContent → write the page's tree back to localStorage
 *
 * One backend instance is bound to one project+page — the shell creates a
 * fresh one each time it opens a page in the editor.
 */

/**
 * @param {object} cfg
 * @param {Array}  cfg.schema    the schema.json array (list of NodeMeta)
 * @param {object} cfg.defaults  the defaults.json map ({ type → default node })
 * @param {object} cfg.store     a ProjectStore
 * @param {string} cfg.projectId
 * @param {string} cfg.pageId
 */
export function createLocalStorageBackend({ schema, defaults, store, projectId, pageId }) {
    // The editor wants the schema as a map keyed by type (RestBackend does the
    // same list→map conversion after fetching /editor/api/schema).
    const schemaMap = {};
    for (const meta of schema) schemaMap[meta.type] = meta;

    return {
        async loadSchema() {
            return schemaMap;
        },

        async loadContent() {
            return store.loadTree(projectId, pageId);
        },

        async saveContent(content) {
            await store.saveTree(projectId, pageId, content?.root ?? null);
        },

        async loadDefault(type) {
            const template = defaults[type];
            if (!template) throw new Error(`no bundled default for node type "${type}"`);
            // Deep clone so edits never mutate the shared template, then give
            // the node a fresh id. The bundled default id looks like
            // "form-ab12cd"; we swap the trailing token for a new nonce so
            // repeated adds don't collide (id uniqueness is an authoring
            // concern the editor only warns about, but fresh ids keep it clean).
            const clone = JSON.parse(JSON.stringify(template));
            if (typeof clone.id === "string" && clone.id) {
                const prefix = clone.id.replace(/-[a-z0-9]+$/i, "");
                clone.id = `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
            }
            return clone;
        },
    };
}
