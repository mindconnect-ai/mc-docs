/*
 * Project/page persistence for the backend-free editor — everything lives in
 * the browser's localStorage.
 *
 * Layout:
 *   sui-editor:index                     → { projects: [ { id, name, createdAt,
 *                                              pages: [ { id, name, updatedAt } ] } ] }
 *   sui-editor:page:<projectId>:<pageId> → { root: <UiNode|null> }
 *
 * The index is kept small (names + timestamps only) so it stays cheap to
 * rewrite on every rename/reorder; the page trees live in their own keys so
 * saving one page never rewrites the others.
 */

const INDEX_KEY = "sui-editor:index";
const pageKey = (projectId, pageId) => `sui-editor:page:${projectId}:${pageId}`;

function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export class ProjectStore {
    constructor() {
        this.index = this._loadIndex();
    }

    _loadIndex() {
        try {
            const raw = localStorage.getItem(INDEX_KEY);
            if (raw) return JSON.parse(raw);
        } catch (_) { /* corrupt / unavailable → fresh index */ }
        return { projects: [] };
    }

    _saveIndex() {
        try { localStorage.setItem(INDEX_KEY, JSON.stringify(this.index)); }
        catch (_) { /* storage full / disabled — stays in-memory for this session */ }
    }

    // ── Reads ────────────────────────────────────────────────────────────────

    projects() { return this.index.projects; }
    project(id) { return this.index.projects.find(p => p.id === id) || null; }
    page(projectId, pageId) {
        const p = this.project(projectId);
        return p ? (p.pages.find(pg => pg.id === pageId) || null) : null;
    }

    // ── Project mutations ──────────────────────────────────────────────────────

    createProject(name) {
        const proj = { id: uid("proj"), name: name || "Untitled project", createdAt: Date.now(), pages: [] };
        this.index.projects.push(proj);
        this._saveIndex();
        return proj;
    }

    renameProject(id, name) {
        const p = this.project(id);
        if (p) { p.name = name; this._saveIndex(); }
    }

    deleteProject(id) {
        const p = this.project(id);
        if (!p) return;
        for (const pg of p.pages) localStorage.removeItem(pageKey(id, pg.id));
        this.index.projects = this.index.projects.filter(x => x.id !== id);
        this._saveIndex();
    }

    // ── Page mutations ─────────────────────────────────────────────────────────

    createPage(projectId, name) {
        const proj = this.project(projectId);
        if (!proj) return null;
        const page = { id: uid("page"), name: name || "Untitled page", updatedAt: Date.now() };
        proj.pages.push(page);
        this._saveIndex();
        // Seed an empty tree so the editor has something to load immediately.
        this.saveTree(projectId, page.id, null);
        return page;
    }

    renamePage(projectId, pageId, name) {
        const pg = this.page(projectId, pageId);
        if (pg) { pg.name = name; this._saveIndex(); }
    }

    deletePage(projectId, pageId) {
        const proj = this.project(projectId);
        if (!proj) return;
        proj.pages = proj.pages.filter(pg => pg.id !== pageId);
        localStorage.removeItem(pageKey(projectId, pageId));
        this._saveIndex();
    }

    // ── Page tree (the UiNode being edited) ────────────────────────────────────

    loadTree(projectId, pageId) {
        try {
            const raw = localStorage.getItem(pageKey(projectId, pageId));
            if (raw) return JSON.parse(raw);
        } catch (_) { /* corrupt → empty tree */ }
        return { root: null };
    }

    saveTree(projectId, pageId, root) {
        try { localStorage.setItem(pageKey(projectId, pageId), JSON.stringify({ root: root ?? null })); }
        catch (_) { /* storage full — best effort */ }
        const pg = this.page(projectId, pageId);
        if (pg) { pg.updatedAt = Date.now(); this._saveIndex(); }
    }

    // ── Snapshot for exporters / seeding a downloaded app ──────────────────────

    /**
     * A single self-contained object holding the index plus every page tree,
     * keyed {@code "<projectId>/<pageId>"}. Downloaded apps embed this as their
     * seed so the exported copy opens with the same projects and pages.
     */
    exportAll() {
        const out = { index: this.index, pages: {} };
        for (const proj of this.index.projects) {
            for (const pg of proj.pages) {
                out.pages[`${proj.id}/${pg.id}`] = this.loadTree(proj.id, pg.id);
            }
        }
        return out;
    }

    /**
     * Loads a snapshot produced by {@link exportAll} — used by downloaded apps
     * to seed their localStorage with the projects they were exported with.
     * Replaces the current index and page trees wholesale.
     */
    importAll(snapshot) {
        if (!snapshot || !snapshot.index) return;
        this.index = snapshot.index;
        this._saveIndex();
        for (const [key, content] of Object.entries(snapshot.pages || {})) {
            const [projectId, pageId] = key.split("/");
            try { localStorage.setItem(pageKey(projectId, pageId), JSON.stringify(content)); }
            catch (_) { /* storage full — best effort */ }
        }
    }
}
