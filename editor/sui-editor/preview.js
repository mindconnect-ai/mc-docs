const SELECTED_CLASS = "sui-editor-selected";
export class Preview {
    host;
    state;
    renderer = null;
    constructor(host, state) {
        this.host = host;
        this.state = state;
        this.host.classList.add("sui-editor-preview-host");
        this.installClickInterceptor();
        this.attachRenderer().then(() => {
            // Once the renderer is live, register for state changes. Pre-renderer
            // ticks (the subscribe() seed call) are harmless because render()
            // bails when the renderer isn't ready yet.
            this.state.subscribe(() => this.render());
        });
    }
    /**
     * Editor-mode shim for the rendered DOM:
     *
     * <p>The preview mounts a real {@link SuiRenderer}, so anything it paints
     * has the same {@code data-action} / {@code data-trigger} / form markup
     * as production. We DO NOT install the {@code SuiEventBus} here — that's
     * the simplest way to make sure no fetches fire from preview clicks.
     *
     * <p>Even so, native click side-effects still happen: an {@code <a href>}
     * navigates the browser away, a {@code <button type=submit>} submits its
     * form. To suppress all of those AND turn the click into a tree-selection
     * action, we attach one capture-phase listener on the host. Capture phase
     * matters because it runs before any bubbling handler the renderer's
     * bundle might add later (today there are none, but the editor must stay
     * robust if the core bundle starts attaching local handlers).
     */
    installClickInterceptor() {
        this.host.addEventListener("click", (e) => {
            const target = e.target;
            if (!target)
                return;
            // Allow native interaction with the JSON textareas / inputs inside
            // the host — currently there are none, but the guard is cheap and
            // future-proof.
            if (target.closest("[data-sui-editor-passthrough]"))
                return;
            e.preventDefault();
            e.stopPropagation();
            const path = this.pathForElement(target);
            // Always update selection so clicking blank space deselects.
            this.state.setSelection(path);
        }, /* capture */ true);
        // Also swallow submits: a stray <form> inside the preview would
        // otherwise navigate the whole editor away.
        this.host.addEventListener("submit", (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, /* capture */ true);
    }
    /**
     * Walks up from the clicked element looking for the nearest {@code [id]}
     * — that id matches a node's model id, which we map back to a selection
     * path. Bails to the empty path when nothing is hit (treated as deselect).
     */
    pathForElement(el) {
        let cursor = el;
        while (cursor && cursor !== this.host) {
            const id = cursor.id;
            if (id) {
                const path = findPathById(this.state.root, id);
                if (path)
                    return path;
            }
            cursor = cursor.parentElement;
        }
        return [];
    }
    async attachRenderer() {
        // Dynamic import keeps the URL out of TypeScript's static module graph.
        // We use a path RELATIVE to this module ("../sui/…") rather than an
        // absolute "/sui/…" so the editor works when the whole site is served
        // from a sub-path (e.g. GitHub Pages at /mc-docs/editor/): the editor
        // bundle lives at …/sui-editor/preview.js and the core bundle at the
        // sibling …/sui/renderer.js in every host (Spring `/sui-editor` + `/sui`,
        // the standalone app, and any sub-path deploy). tsc can't resolve the
        // cross-bundle path, so we suppress the check and cast through the shim.
        // @ts-expect-error — sibling-bundle URL resolved by the browser.
        const mod = (await import("../sui/renderer.js"));
        const renderer = new mod.SuiRenderer(this.host);
        // Force the innerHTML morpher: the editor's preview wants every
        // mutation to land as a clean re-render, not a diff. Idiomorph's
        // attribute-aware diff is great for SPA navigation but can be too
        // conservative when the same form re-appears with only one field
        // changed — exactly the case we exercise here.
        if (typeof renderer.setMorpher === "function") {
            renderer.setMorpher((target, html, mode) => {
                if (mode === "outerHTML")
                    target.outerHTML = html;
                else
                    target.innerHTML = html;
            });
        }
        this.renderer = mod.installDefaultHandlers(renderer);
        // Force one render now that the renderer is online.
        this.render();
    }
    render() {
        if (!this.renderer)
            return;
        const root = this.state.root;
        if (!root) {
            this.host.innerHTML = `<p class="sui-editor-preview-empty">Empty tree — pick something from the toolbar to start.</p>`;
            return;
        }
        // UiPage shape: render its node child rather than the wrapper itself
        // (the wrapper has no renderer handler). Toast / dialog overlay
        // emulation lands in iteration 8 if needed.
        const renderable = (root.type === "page" && root.node) ? root.node : root;
        this.renderer.mount(renderable);
        // The mount call rewrites innerHTML, so any previously-applied
        // highlight class and any tab activation are gone. Re-apply both for
        // the current selection on the freshly-rendered DOM. Order matters:
        // activate tabs first so the selected element is actually visible by
        // the time we paint the highlight on it.
        this.activateTabsForSelection();
        this.applyHighlight();
    }
    /**
     * If the selection sits inside one or more tabbed sections, programmatically
     * activates the enclosing tab(s) so the selected node is actually visible.
     *
     * <p>A tabbed-section path looks like {@code […, "sections", <index>, …]}
     * — every such pair identifies one section/entry pair we need to switch.
     * Works both when the user selects the {@code UiSectionEntry} itself
     * (path ends right at the pair) and when the selection sits deeper inside
     * the entry's content. We walk the path, recover the section node and
     * the targeted entry at each pair, and toggle the tab DOM exactly the
     * way {@code SuiEventBus.switchTab} would (CSS class {@code active} on
     * the tab + {@code hidden} attribute on the sibling panels).
     */
    activateTabsForSelection() {
        const root = this.state.root;
        const path = this.state.selectionPath;
        if (!root)
            return;
        for (let i = 0; i + 1 < path.length; i++) {
            if (path[i] === "sections" && typeof path[i + 1] === "number") {
                const sectionPath = path.slice(0, i);
                const sectionNode = walkPath(root, sectionPath);
                const entries = sectionNode?.sections;
                const entry = Array.isArray(entries) ? entries[path[i + 1]] : null;
                const entryId = entry && typeof entry.id === "string" ? entry.id : null;
                const sectionId = sectionNode?.id;
                if (!entryId || typeof sectionId !== "string")
                    continue;
                this.activateTab(sectionId, entryId);
            }
        }
    }
    /**
     * Activates the tab whose {@code data-target} matches {@code entryId}
     * inside the section identified by {@code sectionId}. Mirrors the runtime
     * behaviour of {@code SuiEventBus.switchTab} (CSS + hidden attribute) so
     * the preview stays handler-free.
     */
    activateTab(sectionId, entryId) {
        const escSection = sectionId.replace(/(["\\])/g, "\\$1");
        const section = this.host.querySelector(`[id="${escSection}"]`);
        if (!section)
            return;
        const tabs = section.querySelectorAll(".sui-tabs > .sui-tab");
        const panels = section.querySelectorAll(".sui-panels > .sui-panel");
        tabs.forEach(t => t.classList.toggle("active", t.dataset.target === entryId));
        panels.forEach(p => { p.hidden = p.id !== entryId; });
    }
    /**
     * Adds the highlight class to the DOM element matching the selected
     * tree node. We look the element up by {@code id} — the renderer's
     * handlers consistently emit {@code id="..."} from the model's id field
     * — and bail silently when nothing matches (e.g. id-less containers
     * like a default UiPage or UiHeader).
     */
    applyHighlight() {
        const selected = resolveSelected(this.state.root, this.state.selectionPath);
        if (!selected || !selected.id || typeof selected.id !== "string")
            return;
        // Escape the id for a CSS attribute selector — node ids are
        // app-supplied and may contain quotes or brackets. Tree-wide id
        // uniqueness is enforced by EditorState.addChild and PropertyPanel,
        // so the first match is always the right one.
        const escaped = selected.id.replace(/(["\\])/g, "\\$1");
        const el = this.host.querySelector(`[id="${escaped}"]`);
        if (el)
            el.classList.add(SELECTED_CLASS);
    }
}
/** Walks the selection path and returns the node at the leaf, or null. */
function resolveSelected(root, path) {
    const value = walkPath(root, path);
    return (value && typeof value === "object" && typeof value.type === "string")
        ? value
        : null;
}
/** Walks a path against the tree and returns whatever sits at the end —
 *  including arrays and entry-wrappers without a {@code type} discriminator.
 *  Returns {@code null} on a stale or out-of-bounds path. */
function walkPath(root, path) {
    if (!root)
        return null;
    let cursor = root;
    for (const hop of path) {
        if (cursor == null)
            return null;
        cursor = cursor[hop];
    }
    return cursor ?? null;
}
/**
 * Depth-first scan of the tree for the first node whose {@code id} matches.
 * Records the path as a sequence of property/index hops so the result feeds
 * straight back into {@link EditorState#setSelection}. Returns {@code null}
 * when nothing matches (id-less wrappers, stale DOM after a re-render, …).
 */
function findPathById(root, id) {
    if (!root)
        return null;
    const out = [];
    return walk(root, out) ? out : null;
    function walk(node, path) {
        if (node == null || typeof node !== "object")
            return false;
        if (node.id === id)
            return true;
        for (const key of Object.keys(node)) {
            if (key === "id" || key === "type")
                continue;
            const value = node[key];
            if (Array.isArray(value)) {
                for (let i = 0; i < value.length; i++) {
                    path.push(key, i);
                    if (walk(value[i], path))
                        return true;
                    path.pop();
                    path.pop();
                }
            }
            else if (value && typeof value === "object") {
                path.push(key);
                if (walk(value, path))
                    return true;
                path.pop();
            }
        }
        return false;
    }
}
