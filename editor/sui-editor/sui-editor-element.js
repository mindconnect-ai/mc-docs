/*
 * <sui-editor> — the visual editor as an embeddable Web Component.
 *
 * It edits ONE UiNode tree through the three panes (Tree · JSON/Monaco property
 * editor · live Preview) and knows nothing about projects, pages or storage.
 * The host app drives it with two properties and one event:
 *
 *   const ed = document.querySelector("sui-editor");
 *   ed.catalogue = { schema, defaults };      // node catalogue (picker + panel)
 *   ed.value     = { root: <UiNode|null> };    // the tree to edit
 *   ed.addEventListener("change", e => save(e.detail.root));   // on every edit
 *
 * Light DOM (no shadow root) so the global sui.css / editor.css apply and Monaco
 * works unchanged. Internally it reuses EditorState + TreeView + PropertyPanel +
 * Preview + the split-pane gutters — the same pieces bootEditor wires, minus the
 * app chrome (toolbar / save / navigation), which is the host's concern.
 */
import { EditorState } from "./editor-state.js";
import { setBackend } from "./backend.js";
import { TreeView } from "./tree-view.js";
import { PropertyPanel } from "./property-panel.js";
import { Preview } from "./preview.js";
import { installSplitters } from "./splitter.js";
export class SuiEditorElement extends HTMLElement {
    _catalogue = null;
    _value = { root: null };
    state = null;
    /** While true, tree mutations don't emit "change" (used for seeding). */
    suppress = false;
    // ── Properties ─────────────────────────────────────────────────────────
    get catalogue() { return this._catalogue; }
    set catalogue(cat) {
        this._catalogue = cat;
        this.build();
    }
    get value() {
        return { root: this.state ? this.state.root : this._value.root };
    }
    set value(v) {
        this._value = v ?? { root: null };
        if (this.state)
            this.applyValue();
        else
            this.build();
    }
    connectedCallback() {
        this.build();
    }
    // ── Internals ──────────────────────────────────────────────────────────
    /** (Re)builds the panes once both connected and a catalogue is present. */
    build() {
        if (!this.isConnected || !this._catalogue)
            return;
        // A backend that serves schema + defaults straight from the catalogue —
        // no network. The shared views (TreeView) reach it via the module
        // singleton, matching how the rest of the editor already works.
        setBackend(catalogueBackend(this._catalogue));
        this.innerHTML = mainLayout();
        installSplitters(this);
        const schemaMap = {};
        for (const meta of this._catalogue.schema)
            schemaMap[meta.type] = meta;
        this.state = new EditorState(schemaMap);
        const treeHost = this.querySelector(".sui-editor-tree");
        const panelHost = this.querySelector(".sui-editor-panel");
        const previewHost = this.querySelector(".sui-editor-preview");
        new TreeView(treeHost, this.state);
        new PropertyPanel(panelHost, this.state);
        new Preview(previewHost, this.state);
        // Seed the tree without emitting a change; then emit on every real edit.
        this.suppress = true;
        this.state.replaceRoot(this._value.root ?? null);
        this.state.subscribe(() => {
            if (this.suppress)
                return;
            this.dispatchEvent(new CustomEvent("change", {
                detail: { root: this.state.root }, bubbles: true,
            }));
        });
        this.suppress = false;
    }
    /** Applies an externally-set value onto a live editor without echoing a change. */
    applyValue() {
        if (!this.state)
            return;
        const current = JSON.stringify(this.state.root ?? null);
        const next = JSON.stringify(this._value.root ?? null);
        if (current === next)
            return;
        this.suppress = true;
        this.state.replaceRoot(this._value.root ?? null);
        this.suppress = false;
    }
}
/** The three-pane layout (no toolbar — the host owns chrome). */
function mainLayout() {
    return (`<div class="sui-editor-main">` +
        `  <aside class="sui-editor-tree-pane">` +
        `    <h2>Tree</h2><div class="sui-editor-tree"></div>` +
        `  </aside>` +
        `  <div class="sui-editor-gutter sui-editor-gutter--col" data-splitter="col" title="Drag to resize · double-click to reset"></div>` +
        `  <section class="sui-editor-right">` +
        `    <div class="sui-editor-panel-pane"><h2>Properties</h2><div class="sui-editor-panel"></div></div>` +
        `    <div class="sui-editor-gutter sui-editor-gutter--row" data-splitter="row" title="Drag to resize · double-click to reset"></div>` +
        `    <div class="sui-editor-preview-pane"><h2>Preview</h2><div class="sui-editor-preview"></div></div>` +
        `  </section>` +
        `</div>`);
}
function catalogueBackend(cat) {
    const schemaMap = {};
    for (const meta of cat.schema)
        schemaMap[meta.type] = meta;
    return {
        async loadSchema() { return schemaMap; },
        async loadContent() { return {}; }, // unused; the element seeds via value
        async saveContent() { },
        async loadDefault(type) {
            const template = cat.defaults[type];
            if (!template)
                throw new Error(`no default for node type "${type}"`);
            const clone = JSON.parse(JSON.stringify(template));
            if (typeof clone.id === "string" && clone.id) {
                const prefix = clone.id.replace(/-[a-z0-9]+$/i, "");
                clone.id = `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
            }
            return clone;
        },
    };
}
if (!customElements.get("sui-editor")) {
    customElements.define("sui-editor", SuiEditorElement);
}
