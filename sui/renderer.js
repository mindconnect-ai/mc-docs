// Per-type render functions live under {@code ./renderers/}. They're
// imported here only to be registered as default handlers — the dispatcher
// itself never calls them directly.
import { renderForm } from "./renderers/form.js";
import { renderDetail } from "./renderers/detail.js";
import { renderList } from "./renderers/list.js";
import { renderTree, renderTreeNode } from "./renderers/tree.js";
import { renderSection } from "./renderers/section.js";
import { renderSectionEntry } from "./renderers/section-entry.js";
import { renderStack } from "./renderers/stack.js";
import { renderTable } from "./renderers/table.js";
import { renderColumn } from "./renderers/column.js";
import { renderRow } from "./renderers/row.js";
import { renderChart } from "./renderers/chart.js";
import { renderHeader } from "./renderers/header.js";
import { renderText } from "./renderers/text.js";
import { renderLink } from "./renderers/link.js";
import { renderAction } from "./renderers/action.js";
import { renderField } from "./renderers/field.js";
import { renderFieldGroup } from "./renderers/fieldgroup.js";
import { renderDialog } from "./renderers/dialog.js";
import { renderUpload } from "./renderers/upload.js";
// Default item-handler for the UiList rendering — set on the SuiRenderer
// at construction time. List items have no type discriminator so they
// can't go through the dispatcher; they get their own handler slot.
import { defaultRenderItem } from "./renderers/shared.js";
export class SuiRenderer {
    handlers = new Map();
    itemHandler = defaultRenderItem;
    rootElement = null;
    loadingDepth = 0;
    loadingIndicator = defaultLoadingIndicator;
    morpher = innerHtmlMorpher;
    morphPromise = null;
    /**
     * Optionally bind the renderer to a host element. Once mounted,
     * {@link SuiRenderer#mount} and {@link SuiRenderer#applyPatch} write
     * directly into it, which is the simplest way to wire the renderer into
     * a page that has a single content container. Callers that need finer
     * control (e.g. an app that owns its own patch dispatcher) can leave
     * the constructor argument empty and keep using the lower-level
     * {@link SuiRenderer#render} string API.
     *
     * <p>Kicks off a lazy load of Idiomorph from a CDN so subsequent
     * {@link #mount}/{@link #applyPatch} calls can preserve focus, scroll
     * position and CSS-animation state across DOM swaps. Until the library
     * has resolved, swaps fall back to {@code innerHTML} replacement —
     * functionally correct, just without state preservation. Apps that
     * never want the network dependency can swap the implementation via
     * {@link #setMorpher}.
     */
    constructor(rootElement) {
        if (rootElement)
            this.rootElement = rootElement;
        this.kickoffMorphLoad();
    }
    /**
     * Loads Idiomorph from the CDN and installs it as the active morpher.
     * The first {@link #mount}/{@link #applyPatch} call typically happens
     * within microseconds of the constructor, so the first paint will
     * almost always be the innerHTML fallback; every subsequent swap uses
     * Idiomorph.
     */
    kickoffMorphLoad() {
        if (this.morphPromise)
            return;
        this.morphPromise = import(/* @vite-ignore */ IDIOMORPH_URL)
            .then(mod => {
            const lib = (mod.Idiomorph ?? mod.default ?? mod);
            if (typeof lib?.morph !== "function") {
                throw new Error("Idiomorph: unexpected module shape");
            }
            this.morpher = idiomorphMorpher(lib);
            return this.morpher;
        })
            .catch(err => {
            console.warn("SuiRenderer: Idiomorph load failed; falling back to innerHTML morph", err);
            return this.morpher;
        });
    }
    /**
     * Replaces the morpher with a custom implementation. Useful for apps
     * that bundle Idiomorph themselves, want a different morph library, or
     * deliberately disable morphing (e.g. for SSR snapshot diffing).
     */
    setMorpher(morpher) {
        this.morpher = morpher;
        // Cancel the in-flight CDN load — the app has chosen explicitly.
        this.morphPromise = Promise.resolve(morpher);
        return this;
    }
    /**
     * Registers (or replaces) a handler for one node type. Returns
     * {@code this} for chaining. The node type {@code N} can be a core
     * {@link UiNode} subtype or any extension-defined shape that carries a
     * {@code type: string} discriminator.
     */
    register(type, handler) {
        this.handlers.set(type, handler);
        return this;
    }
    /** Replaces the list-item handler. The default supports the full UiListItem shape. */
    registerItemHandler(handler) {
        this.itemHandler = handler;
        return this;
    }
    /** Returns true if a handler is registered for the given type. */
    has(type) {
        return this.handlers.has(type);
    }
    /**
     * Renders a node tree to an HTML string. Unknown types fall back to a
     * {@code <pre>} dump with a {@code console.warn} — visible enough to
     * catch missing handlers in development without crashing the page.
     */
    render(node) {
        if (node == null)
            return "";
        const handler = this.handlers.get(node.type);
        if (!handler) {
            console.warn("SuiRenderer: no handler for node type", node.type);
            return `<pre>${escapeHtml(JSON.stringify(node, null, 2))}</pre>`;
        }
        return handler(node, this);
    }
    /**
     * Binds the renderer to a host element (or rebinds it). Subsequent
     * {@link #mount} calls will replace the host's content with the rendered
     * tree. Returns {@code this} for chaining.
     */
    attach(rootElement) {
        this.rootElement = rootElement;
        return this;
    }
    /**
     * Returns the currently attached host element, or {@code null} when the
     * renderer is being used in pure-string mode (e.g. for patch dispatching
     * outside the host root).
     */
    root() {
        return this.rootElement;
    }
    /**
     * Renders the node and merges the result into the attached host
     * element via the active morpher. Existing DOM nodes survive the swap
     * when they have matching {@code id}s, which preserves focus, scroll
     * position and CSS animation state on the unchanged subtree. Throws
     * when no host has been provided.
     */
    mount(node) {
        if (!this.rootElement) {
            throw new Error("SuiRenderer.mount(): no host element attached");
        }
        this.morpher(this.rootElement, this.render(node), "innerHTML");
        return this;
    }
    /**
     * Renders the node and merges it into the given element via the active
     * morpher. Used by the patch dispatcher to replace sub-trees identified
     * by {@code id} without touching the surrounding DOM.
     */
    renderInto(element, node) {
        this.morpher(element, this.render(node), "innerHTML");
    }
    /** Renders one list item. Exposed so list handlers can delegate. */
    renderItem(item) {
        return this.itemHandler(item, this);
    }
    /**
     * Applies a server-issued patch. Each operation targets an element by
     * {@code id} and either replaces it, appends to it, or clears it.
     *
     * <ul>
     *   <li><b>REPLACE</b> morphs the target's outer HTML so focus,
     *       selection and CSS-animation state on the unchanged subtree
     *       survive the swap (via Idiomorph; falls back to plain outerHTML
     *       replacement while the library is still loading).</li>
     *   <li><b>APPEND</b> appends the rendered node to the target. When the
     *       node is a {@link UiList}, items are appended directly into the
     *       target's {@code <ul>} so the list header isn't duplicated; the
     *       sentinel {@code [data-id="empty"]} placeholder, if present, is
     *       removed first. If the user was scrolled to the bottom of the
     *       container, the scroll position is updated to follow the new
     *       tail; otherwise it is left alone (so a user reading older
     *       messages isn't yanked away).</li>
     *   <li><b>CLEAR</b> empties the target via the morpher.</li>
     *   <li><b>REMOVE</b> removes the target element itself from the DOM.
     *       When the target lives inside a list item, the wrapping {@code
     *       <li>} is dropped too, so transient placeholders disappear
     *       without leaving an empty row.</li>
     * </ul>
     *
     * <p>Read-position stability for prepended content is additionally
     * supported by the browser's native {@code overflow-anchor} (default in
     * {@code sui.css}).
     */
    applyPatch(patch) {
        if (!patch || !patch.patches)
            return this;
        for (const op of patch.patches) {
            this.applyPatchOp(op);
        }
        return this;
    }
    applyPatchOp(op) {
        const target = document.getElementById(op.targetId);
        if (!target)
            return;
        // Row/column patches inside a table are model updates, not DOM
        // morphs: the table re-renders from its embedded model so header,
        // cells and selection state stay consistent (a lone <tr>/<th> swap
        // couldn't re-render a column's cells or apply cellTemplates).
        if (this.applyTablePatch(op, target))
            return;
        switch (op.op) {
            case "REPLACE": {
                if (!op.node)
                    return;
                // Both APPEND and REPLACE can grow a chat-style scroll
                // container: APPEND adds a new item, REPLACE swaps a
                // streaming token-by-token message and the message gets
                // taller. Sample the scroller around either op so the
                // tail-chase fires for both.
                this.withTailChase(target, () => {
                    this.morpher(target, this.render(op.node), "outerHTML");
                });
                break;
            }
            case "APPEND": {
                if (!op.node)
                    return;
                // For appends we deliberately don't morph: we want to add
                // new content, not reconcile against existing siblings.
                this.withTailChase(target, () => {
                    const type = op.node.type;
                    if (type === "list") {
                        this.appendListItems(target, op.node);
                    }
                    else {
                        // Tree rows are <li>s that belong inside the tree's
                        // <ul> (root list or a node's children list), not at
                        // the end of the targeted container itself.
                        const host = type === "tree-node"
                            ? this.treeAppendHost(target) ?? target
                            : target;
                        const tmp = document.createElement("div");
                        tmp.innerHTML = this.render(op.node);
                        while (tmp.firstChild)
                            host.appendChild(tmp.firstChild);
                    }
                });
                break;
            }
            case "CLEAR":
                this.morpher(target, "", "innerHTML");
                break;
            case "REMOVE": {
                // Drop the target element entirely. If the target sits
                // inside a list item (<li>), drop the wrapping <li> so we
                // don't leave behind an empty list row.
                const li = target.closest("li");
                (li ?? target).remove();
                break;
            }
        }
    }
    /**
     * Runs {@code mutate} and, if the surrounding scroll container was
     * already at the bottom before the mutation, scrolls it back to the
     * bottom afterwards. The container is found by walking up from
     * {@code target} until a vertically-scrollable ancestor is found, then
     * looking inside {@code target} if none up the tree qualifies (chat
     * pattern: list-div with inner scrolling {@code <ul>}).
     *
     * <p>The tail-chase scroll is deferred to the next animation frame so
     * the browser has finished its layout pass after {@code mutate} —
     * otherwise {@code scrollHeight} can still be stale and we end up
     * scrolling to the pre-mutation bottom, which leaves the appended
     * content hidden below the fold. A second {@code requestAnimationFrame}
     * pin covers the common case where the appended subtree contains
     * Markdown that paints in a follow-up frame (e.g. when the markdown
     * extension is still resolving its CDN import on first use).
     */
    withTailChase(target, mutate) {
        const scroller = ancestorScroller(target) ?? findScroller(target);
        const wasAtBottom = scroller != null && isAtBottom(scroller);
        mutate();
        if (wasAtBottom && scroller) {
            requestAnimationFrame(() => {
                scroller.scrollTop = scroller.scrollHeight;
                requestAnimationFrame(() => {
                    scroller.scrollTop = scroller.scrollHeight;
                });
            });
        }
    }
    /**
     * Handles patch ops that address a table's rows or columns. Tables
     * render with their full model embedded as {@code data-node} (see
     * renderTable); a matching patch edits that model and re-renders the
     * whole table through the morpher, which keeps thead/tbody/selection
     * consistent and preserves focus/scroll.
     *
     * <p>Handled cases — returns {@code true} when consumed:
     * <ul>
     *   <li>{@code REPLACE} a {@code row}/{@code column} node whose target
     *       id matches a model row/column;</li>
     *   <li>{@code REMOVE} where the target id matches a model row/column;</li>
     *   <li>{@code APPEND} a {@code row} node targeting the table itself
     *       (appends to {@code rows}; an existing id is replaced instead so
     *       repeated appends stay idempotent).</li>
     * </ul>
     * Anything else (e.g. patching a cell-template subtree, whose suffixed
     * ids never match model entries) falls back to the generic DOM path.
     */
    applyTablePatch(op, target) {
        const wrapper = target.closest('[data-sui="table"][data-node]');
        if (!wrapper)
            return false;
        let model;
        try {
            model = JSON.parse(wrapper.getAttribute("data-node"));
        }
        catch {
            return false;
        }
        const rows = model.rows ?? (model.rows = []);
        const cols = model.columns ?? (model.columns = []);
        const type = op.node?.type;
        let changed = false;
        if (op.op === "APPEND" && target === wrapper && type === "row") {
            const idx = rows.findIndex(x => x.id != null && x.id === op.node.id);
            if (idx >= 0)
                rows[idx] = op.node;
            else
                rows.push(op.node);
            changed = true;
        }
        else if (target !== wrapper && op.op === "REPLACE" && (type === "row" || type === "column")) {
            const list = type === "row" ? rows : cols;
            const idx = list.findIndex(x => x.id === op.targetId);
            if (idx < 0)
                return false;
            list[idx] = op.node;
            changed = true;
        }
        else if (target !== wrapper && op.op === "REMOVE") {
            const ri = rows.findIndex(x => x.id === op.targetId);
            const ci = ri < 0 ? cols.findIndex(x => x.id === op.targetId) : -1;
            if (ri < 0 && ci < 0)
                return false;
            if (ri >= 0)
                rows.splice(ri, 1);
            else
                cols.splice(ci, 1);
            changed = true;
        }
        if (!changed)
            return false;
        this.withTailChase(wrapper, () => {
            this.morpher(wrapper, this.render(model), "outerHTML");
        });
        return true;
    }
    /**
     * Resolves where an APPENDed {@code tree-node} <li> should land within
     * {@code target}:
     * <ul>
     *   <li>target is the tree container → its root {@code .sui-tree-list};</li>
     *   <li>target is an expandable tree row → its {@code .sui-tree-children}
     *       list (created on the fly when the row has a body but no children
     *       yet, e.g. content-only nodes);</li>
     *   <li>anything else → {@code null}, caller falls back to the target
     *       itself. A collapsed leaf can't grow children this way — REPLACE
     *       the row instead.</li>
     * </ul>
     */
    treeAppendHost(target) {
        const rootList = target.querySelector(":scope > ul.sui-tree-list");
        if (rootList)
            return rootList;
        const body = target.querySelector(":scope > details > .sui-tree-body");
        if (!body)
            return null;
        let children = body.querySelector(":scope > ul.sui-tree-children");
        if (!children) {
            children = document.createElement("ul");
            children.className = "sui-tree-children";
            children.setAttribute("role", "group");
            body.appendChild(children);
        }
        return children;
    }
    appendListItems(target, node) {
        const ul = target.querySelector("ul");
        if (!ul)
            return;
        // Conventional placeholder used by empty-state list rendering:
        // <li data-id="empty">…</li>. Drop it on the first real item.
        const placeholder = ul.querySelector('[data-id="empty"]');
        if (placeholder)
            placeholder.remove();
        for (const item of (node.items ?? [])) {
            const tmp = document.createElement("ul");
            tmp.innerHTML = this.renderItem(item);
            const first = tmp.firstElementChild;
            if (first)
                ul.appendChild(first);
        }
    }
    // ── Loading indicator ─────────────────────────────────────────────────
    /**
     * Replaces the loading indicator implementation. The default draws a
     * subtle overlay on top of the root element with a progress bar; apps
     * with their own loading aesthetic (spinner in the header, branded
     * shimmer, …) replace it here. {@link #showLoading} and
     * {@link #hideLoading} use the new implementation immediately.
     */
    setLoadingIndicator(indicator) {
        this.loadingIndicator = indicator;
        return this;
    }
    /**
     * Shows the loading indicator. Reference-counted: concurrent dispatches
     * (e.g. an SSE stream over a navigation) increment the counter, only
     * the matching number of {@link #hideLoading} calls hides it. Apps
     * usually don't call this directly — the EventBus does, around every
     * behaviour dispatch.
     */
    showLoading() {
        if (!this.rootElement)
            return;
        this.loadingDepth++;
        if (this.loadingDepth === 1)
            this.loadingIndicator.show(this.rootElement);
    }
    /** Counterpart to {@link #showLoading}. Safe to call when not loading. */
    hideLoading() {
        if (!this.rootElement)
            return;
        if (this.loadingDepth === 0)
            return;
        this.loadingDepth--;
        if (this.loadingDepth === 0)
            this.loadingIndicator.hide(this.rootElement);
    }
}
/**
 * Default loading indicator: lazily attaches a {@code .sui-loading-overlay}
 * element to the root and toggles a {@code .sui-loading} class on the root
 * to drive the CSS. The overlay itself is a single absolutely-positioned
 * {@code <div>} with a progress bar pseudo-element; the {@code position:
 * relative} requirement on the root is set inline so consumers don't have
 * to remember it in their CSS.
 */
const defaultLoadingIndicator = {
    show(root) {
        ensureRootIsPositioned(root);
        let overlay = root.querySelector(":scope > .sui-loading-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "sui-loading-overlay";
            overlay.innerHTML = '<div class="sui-loading-bar"></div>';
            root.appendChild(overlay);
        }
        root.classList.add("sui-loading");
    },
    hide(root) {
        root.classList.remove("sui-loading");
    },
};
function ensureRootIsPositioned(root) {
    const cs = getComputedStyle(root);
    if (cs.position === "static")
        root.style.position = "relative";
}
// ── HTML escaping ───────────────────────────────────────────────────────────
const HTML_ESCAPE_MAP = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};
/**
 * Escapes user-supplied data for safe interpolation into HTML element bodies
 * and double-quoted attribute values. The replacement set also covers
 * single quotes, which lets the same helper guard {@code data-*} attributes
 * we emit with single-quoted JSON payloads.
 */
export function escapeHtml(value) {
    if (value == null)
        return "";
    return String(value).replace(/[&<>"']/g, ch => HTML_ESCAPE_MAP[ch]);
}
/**
 * Encodes a {@link UiTrigger} as a single-quoted attribute payload. The
 * returned string contains JSON whose single quotes are HTML-escaped to
 * {@code &#39;}, so it can be embedded inside {@code data-trigger='…'}
 * without breaking the DOM parser.
 */
export function encodeTrigger(trigger) {
    return JSON.stringify(trigger).replace(/'/g, "&#39;");
}
// ── Default handlers ────────────────────────────────────────────────────────
/**
 * Wires the standard semantic-ui node types into a renderer. Application code
 * calls this once after construction, then registers its own overrides.
 *
 * <p>Each render function lives in its own file under {@code ./renderers/}.
 * That keeps this module's concern small (registry + dispatcher + utilities)
 * and matches the SSR side, where every node type owns a {@code .hbs}
 * template file under {@code templates/sui/}.
 */
export function installDefaultHandlers(renderer) {
    return renderer
        .register("list", renderList)
        .register("tree", renderTree)
        .register("tree-node", renderTreeNode)
        .register("form", renderForm)
        .register("detail", renderDetail)
        .register("section", renderSection)
        .register("section-entry", renderSectionEntry)
        .register("stack", renderStack)
        .register("table", renderTable)
        .register("column", renderColumn)
        .register("row", renderRow)
        .register("chart", renderChart)
        .register("header", renderHeader)
        .register("text", renderText)
        // Top-level handlers for nodes that were historically only emitted
        // as sub-elements by their containers (UiForm.fields, UiDetail.links,
        // …). They're addressable as standalone nodes now so cellTemplate
        // can drop a single link / action / field straight into a table
        // cell. Container-internal callers still call the helpers in
        // {@code renderers/shared.ts} which preserves the original markup.
        .register("link", renderLink)
        .register("action", renderAction)
        .register("field", renderField)
        .register("fieldgroup", renderFieldGroup)
        .register("dialog", renderDialog)
        .register("upload", renderUpload);
}
/** Convenience: a fresh renderer pre-loaded with the default handlers. */
export function createDefaultRenderer() {
    return installDefaultHandlers(new SuiRenderer());
}
/** Fallback morpher: plain string assignment. Used before Idiomorph loads. */
const innerHtmlMorpher = (target, newContent, mode) => {
    if (mode === "outerHTML")
        target.outerHTML = newContent;
    else
        target.innerHTML = newContent;
};
const IDIOMORPH_URL = "https://cdn.jsdelivr.net/npm/idiomorph@0.7.4/+esm";
/**
 * Builds a Morpher that delegates to a resolved Idiomorph instance.
 *
 * <p>Two pieces of user-owned state are protected from server re-renders:
 * the value of the field the user is currently editing ({@code ignoreActiveValue}),
 * and the open/closed state of any {@code <details data-sui-client-collapse>}
 * (via {@code beforeAttributeUpdated}). The latter lets live-updating cards —
 * tool calls, sub-agent activity — keep whatever the user manually expanded or
 * collapsed, instead of snapping back to the server's idea of {@code open} on
 * every streaming patch.
 */
function idiomorphMorpher(lib) {
    return (target, newContent, mode) => {
        lib.morph(target, newContent, {
            morphStyle: mode,
            // Don't clobber what the user is currently typing — the
            // server's view of the form value is, by definition, stale
            // while the user is still editing.
            ignoreActiveValue: true,
            callbacks: {
                beforeAttributeUpdated: (attributeName, node) => {
                    // Leave the `open` attribute alone on client-controlled
                    // <details>: its expand/collapse is owned by the user, not
                    // the server. Returning false tells Idiomorph to skip it.
                    if (attributeName === "open"
                        && node.hasAttribute("data-sui-client-collapse")) {
                        return false;
                    }
                    return undefined;
                },
            },
        });
    };
}
/**
 * Heuristic: "is the user looking at the bottom of this container right
 * now?". Used by the APPEND patch op to decide whether to chase the tail
 * (chat-message arrived, user was already at the bottom) or hold position
 * (user scrolled up to read older messages, leave them where they are).
 */
function isAtBottom(el, thresholdPx = 40) {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
}
/**
 * Returns the element that actually scrolls vertically for the given
 * append target. If the target itself has overflow-y, that's the answer;
 * otherwise we look for the first descendant that does. Used so a UiList
 * whose inner {@code <ul>} is the scroll container still gets
 * tail-chased correctly when items are appended into the {@code <ul>}.
 *
 * <p>Note we check {@code overflow-y} (the CSS rule) rather than
 * {@code scrollHeight > clientHeight} (the dynamic state). The latter
 * would return {@code null} for an empty container that's about to
 * receive its first item — exactly the case we need to handle for the
 * very first chat message.
 */
function findScroller(el) {
    if (canScrollVertically(el))
        return el;
    const candidates = Array.from(el.querySelectorAll("*"));
    for (const c of candidates) {
        if (canScrollVertically(c))
            return c;
    }
    return null;
}
/**
 * Walks up the DOM from {@code el} until a vertically-scrollable element
 * is found. Used by the REPLACE patch op: the patch target itself (a chat
 * message, say) is never scrollable, but its scrolling ancestor
 * (the message list's {@code <ul>}) is the one we need to chase.
 */
function ancestorScroller(el) {
    let cur = el.parentElement;
    while (cur && cur !== document.body) {
        if (canScrollVertically(cur))
            return cur;
        cur = cur.parentElement;
    }
    return null;
}
function canScrollVertically(el) {
    const overflowY = getComputedStyle(el).overflowY;
    return overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
}
