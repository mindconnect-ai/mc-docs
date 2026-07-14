/*
 * Backend-free Semantic UI visual editor — the shell.
 *
 * Views, swapped inside #app:
 *   • Projects list — the landing page: just the projects (core UiTree, flat),
 *     create / rename / delete / open.
 *   • Project page  — one project's pages (core UiTree): new page, open in the
 *     editor, preview, rename, delete, and Download this project as an app.
 *   • Editor        — the mc-sui-editor bootEditor(), wired to a localStorage
 *     backend for the selected page.
 *   • Preview       — the page mounted with a real renderer + event bus.
 *
 * The node catalogue (schema) and default-instance factory output are loaded
 * once from data/schema.json + data/defaults.json — the build dumps them from
 * the same NodeRegistry the Spring editor uses.
 */
import { createDefaultRenderer } from "./sui/renderer.js";
import { SuiEventBus } from "./sui/eventbus.js";
import { bootEditor } from "./sui-editor/editor.js";
import { ProjectStore } from "./store.js";
import { createLocalStorageBackend } from "./local-storage-backend.js";
import { showPreview } from "./preview.js";
import { openExportDialog } from "./exporters/index.js";
import { pinPlainMorpher } from "./offline.js";

const store = new ProjectStore();
let schema = [];
let defaults = {};

const app = () => document.getElementById("app");

// ── Boot ─────────────────────────────────────────────────────────────────────

async function boot() {
    try {
        [schema, defaults] = await Promise.all([
            fetch("./data/schema.json").then(r => r.json()),
            fetch("./data/defaults.json").then(r => r.json()),
        ]);
    } catch (err) {
        app().innerHTML = `<p class="fatal">Failed to load the node catalogue (data/schema.json). ` +
            `Serve this app from a static server so fetch() can read it.</p>`;
        console.error("shell: catalogue load failed", err);
        return;
    }

    // First run (nothing in localStorage yet): seed the bundled starter project
    // so there's something to open. Later runs keep the user's own projects and
    // never re-seed (deleting the sample sticks).
    if (!store.projects().length) {
        try {
            const res = await fetch("./data/seed.json");
            if (res.ok) store.importAll(await res.json());
        } catch (_) { /* no seed shipped — start empty */ }
    }

    showProjects();
}

// A view host + a mounted core renderer/bus. Every view is built from UiNodes
// and driven by INVOKE handlers — no fetch, no framework.
function mountView(buildPage, registerHandlers) {
    app().innerHTML = `<div id="home-root" class="home-root"></div>`;
    const root = document.getElementById("home-root");
    const renderer = pinPlainMorpher(createDefaultRenderer().attach(root));
    const bus = new SuiEventBus(renderer, root);
    bus.setHistoryEnabled(false);
    bus.setLoadingPolicy("manual");
    registerHandlers(bus);
    renderer.mount(buildPage());
    return { renderer, bus };
}

// ── Projects list (landing) ────────────────────────────────────────────────────

function showProjects() {
    mountView(projectsPage, registerProjectsHandlers);
}

function projectsPage() {
    return {
        type: "stack", id: "home", gap: 16,
        children: [
            {
                type: "header", id: "home-header", brand: "🎨 SUI Visual Editor",
                extras: [
                    { type: "action", id: "new-project", label: "＋ New project", style: "PRIMARY",
                      onClick: { behavior: "INVOKE", handler: "project.new" } },
                ],
            },
            projectsListOrEmpty(),
        ],
    };
}

function projectsListOrEmpty() {
    const projects = store.projects();
    if (!projects.length) {
        return emptyState("home-empty", "No projects yet.",
            "Click “＋ New project” to create your first project.");
    }
    return { type: "tree", id: "projects-tree", title: "Projects", nodes: projects.map(projectRow) };
}

function projectRow(proj) {
    return {
        id: `p-${proj.id}`,
        labelNode: rowLabel(`prow-${proj.id}`, [
            { type: "action", id: `po-${proj.id}`, label: `📁 ${proj.name}`, appearance: "LINK", style: "SECONDARY",
              onClick: { behavior: "INVOKE", handler: "project.open", projectId: proj.id } },
            { type: "text", id: `pc-${proj.id}`, text: `${proj.pages.length} page(s)`, cssClass: "tree-muted" },
            btn(`pr-${proj.id}`, "✎", "project.rename", { projectId: proj.id }),
            btn(`pd-${proj.id}`, "🗑", "project.delete", { projectId: proj.id },
                `Delete project “${proj.name}” and all its pages?`),
        ]),
    };
}

function registerProjectsHandlers(bus) {
    bus.registerClientHandler("project.new", () => {
        const name = prompt("Project name:", "My project");
        if (name == null) return;
        store.createProject(name.trim() || "Untitled project");
        return replace("home", projectsPage());
    });
    bus.registerClientHandler("project.rename", (ctx) => {
        const proj = store.project(ctx.trigger.projectId);
        if (!proj) return;
        const name = prompt("Rename project:", proj.name);
        if (name == null) return;
        store.renameProject(proj.id, name.trim() || proj.name);
        return replace("home", projectsPage());
    });
    bus.registerClientHandler("project.delete", (ctx) => {
        store.deleteProject(ctx.trigger.projectId);
        return replace("home", projectsPage());
    });
    bus.registerClientHandler("project.open", (ctx) => {
        showProject(ctx.trigger.projectId);
    });
}

// ── Project page (one project's pages) ─────────────────────────────────────────

function showProject(projectId) {
    if (!store.project(projectId)) { showProjects(); return; }
    mountView(() => projectPage(projectId), (bus) => registerProjectHandlers(bus, projectId));
}

function projectPage(projectId) {
    const proj = store.project(projectId);
    return {
        type: "stack", id: "proj", gap: 16,
        children: [
            {
                type: "header", id: "proj-header", brand: `📁 ${proj.name}`,
                extras: [
                    { type: "action", id: "back", label: "← Projects", style: "SECONDARY",
                      onClick: { behavior: "INVOKE", handler: "nav.projects" } },
                    { type: "action", id: "new-page", label: "＋ New page", style: "PRIMARY",
                      onClick: { behavior: "INVOKE", handler: "page.new", projectId } },
                    { type: "action", id: "preview-project", label: "▶ Preview", style: "SECONDARY",
                      onClick: { behavior: "INVOKE", handler: "project.preview", projectId } },
                    { type: "action", id: "download", label: "⬇ Download app", style: "SECONDARY",
                      onClick: { behavior: "INVOKE", handler: "project.export", projectId } },
                ],
            },
            pagesListOrEmpty(projectId),
        ],
    };
}

function pagesListOrEmpty(projectId) {
    const proj = store.project(projectId);
    if (!proj.pages.length) {
        return emptyState("proj-empty", "No pages yet.",
            "Click “＋ New page” to add a page, then open it in the editor.");
    }
    return { type: "tree", id: "pages-tree", title: "Pages", nodes: proj.pages.map(pg => pageRow(projectId, pg)) };
}

function pageRow(projectId, pg) {
    return {
        id: `pg-${pg.id}`,
        labelNode: rowLabel(`pgrow-${pg.id}`, [
            { type: "action", id: `po-${pg.id}`, label: `📄 ${pg.name}`, appearance: "LINK", style: "SECONDARY",
              onClick: { behavior: "INVOKE", handler: "page.open", projectId, pageId: pg.id } },
            btn(`pgv-${pg.id}`, "▶", "page.preview", { projectId, pageId: pg.id }),
            btn(`pgr-${pg.id}`, "✎", "page.rename", { projectId, pageId: pg.id }),
            btn(`pgd-${pg.id}`, "🗑", "page.delete", { projectId, pageId: pg.id }, `Delete page “${pg.name}”?`),
        ]),
    };
}

function registerProjectHandlers(bus, projectId) {
    bus.registerClientHandler("nav.projects", () => { showProjects(); });

    bus.registerClientHandler("page.new", () => {
        const name = prompt("Page name:", "Home");
        if (name == null) return;
        store.createPage(projectId, name.trim() || "Untitled page");
        return replace("proj", projectPage(projectId));
    });
    bus.registerClientHandler("page.rename", (ctx) => {
        const pg = store.page(projectId, ctx.trigger.pageId);
        if (!pg) return;
        const name = prompt("Rename page:", pg.name);
        if (name == null) return;
        store.renamePage(projectId, ctx.trigger.pageId, name.trim() || pg.name);
        return replace("proj", projectPage(projectId));
    });
    bus.registerClientHandler("page.delete", (ctx) => {
        store.deletePage(projectId, ctx.trigger.pageId);
        return replace("proj", projectPage(projectId));
    });
    bus.registerClientHandler("page.open", (ctx) => {
        showEditor(projectId, ctx.trigger.pageId);
    });
    bus.registerClientHandler("page.preview", (ctx) => {
        showPreview(store, projectId, ctx.trigger.pageId, () => showProject(projectId));
    });
    bus.registerClientHandler("project.preview", () => {
        const proj = store.project(projectId);
        const first = proj && proj.pages[0];
        if (!first) { alert("Add a page to this project first."); return; }
        showPreview(store, projectId, first.id, () => showProject(projectId));
    });
    bus.registerClientHandler("project.export", () => {
        openExportDialog(store, projectId);
    });
}

// ── Editor view ────────────────────────────────────────────────────────────────

async function showEditor(projectId, pageId) {
    const proj = store.project(projectId);
    const pg = store.page(projectId, pageId);
    if (!proj || !pg) { showProject(projectId); return; }
    app().innerHTML = `<div id="sui-editor-root"></div>`;
    const backend = createLocalStorageBackend({ schema, defaults, store, projectId, pageId });
    await bootEditor({
        rootId: "sui-editor-root",
        backend,
        title: `${proj.name} · ${pg.name}`,
        onExit: () => showProject(projectId),
        onPreview: () => showPreview(store, projectId, pageId, () => showEditor(projectId, pageId)),
    });
}

// ── Shared UiNode helpers ───────────────────────────────────────────────────────

function emptyState(id, title, note) {
    return {
        type: "stack", id, gap: 8, cssClass: "home-empty",
        children: [
            { type: "text", id: `${id}-t`, text: title, cssClass: "home-empty-title" },
            { type: "text", id: `${id}-n`, text: note, cssClass: "home-empty-note" },
        ],
    };
}

// A tree node's labelNode: the name plus its inline action buttons.
function rowLabel(id, children) {
    return { type: "stack", id, direction: "HORIZONTAL", gap: 8, cssClass: "tree-row-label", children };
}

function btn(id, label, handler, extra, confirm) {
    const onClick = { behavior: "INVOKE", handler, ...extra };
    const action = { type: "action", id, label, style: "SECONDARY", appearance: "BUTTON", onClick };
    if (confirm) action.confirm = confirm;
    return action;
}

// A REPLACE patch that repaints a whole view stack in place, keeping the
// mounted renderer + bus.
function replace(targetId, node) {
    return { patches: [{ op: "REPLACE", targetId, node }] };
}

boot();
