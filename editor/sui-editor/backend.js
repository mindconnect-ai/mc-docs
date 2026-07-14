/** Fixed API root — see EditorRestController for why it never moves. */
const API_BASE = "/editor/api";
/**
 * The original Spring-backed behaviour: talk to {@code /editor/api/*}. Kept
 * byte-for-byte compatible with the pre-refactor free functions so the
 * Spring-hosted editor is unaffected.
 */
export class RestBackend {
    base;
    constructor(base = API_BASE) {
        this.base = base;
    }
    async loadSchema() {
        const res = await fetch(`${this.base}/schema`, { headers: { Accept: "application/json" } });
        if (!res.ok)
            throw new Error(`schema fetch failed: ${res.status}`);
        const list = await res.json();
        const map = {};
        for (const meta of list)
            map[meta.type] = meta;
        return map;
    }
    async loadContent() {
        const res = await fetch(`${this.base}/state`, { headers: { Accept: "application/json" } });
        if (!res.ok)
            throw new Error(`state fetch failed: ${res.status}`);
        return await res.json();
    }
    async saveContent(content) {
        const res = await fetch(`${this.base}/state`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(content),
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`state save failed: ${res.status} ${text}`);
        }
    }
    async loadDefault(type) {
        const res = await fetch(`${this.base}/default/${encodeURIComponent(type)}`, {
            headers: { Accept: "application/json" },
        });
        if (!res.ok)
            throw new Error(`default fetch for ${type} failed: ${res.status}`);
        return await res.json();
    }
}
let active = null;
/** Installs the backend the editor will use. Call before {@link bootEditor}. */
export function setBackend(backend) {
    active = backend;
}
/** The active backend, defaulting to {@link RestBackend} for Spring hosts. */
export function getBackend() {
    if (!active)
        active = new RestBackend();
    return active;
}
