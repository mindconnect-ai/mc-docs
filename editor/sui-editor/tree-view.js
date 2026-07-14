/*
 * Tree view of the UiNode tree. Click on a row selects; click on a
 * group's plus-button opens the type picker; click on a row's trash
 * deletes the node.
 *
 * Mutations go through the shared {@link EditorState}; views re-render on
 * the resulting snapshot. The tree never holds local state of its own.
 */
import { pickType } from "./add-picker.js";
import { loadDefault } from "./editor-state.js";
export class TreeView {
    host;
    state;
    constructor(host, state) {
        this.host = host;
        this.state = state;
        this.host.classList.add("sui-tree");
        this.host.addEventListener("click", (e) => void this.onClick(e));
        this.state.subscribe((snap) => this.render(snap));
    }
    render(snap) {
        if (!snap.root) {
            this.host.innerHTML =
                `<p class="sui-editor-panel-empty">No content yet.</p>` +
                    `<button class="sui-btn sui-btn--primary" data-action="set-root">+ Add root node</button>`;
            return;
        }
        this.host.innerHTML = this.renderNode(snap.root, snap.schema, [], snap.selection);
    }
    renderNode(node, schema, path, selection) {
        const meta = schema[node.type];
        const id = typeof node.id === "string" ? node.id : "";
        const label = labelFor(node);
        const isSelected = samePath(path, selection);
        const groups = [];
        if (meta?.children?.length) {
            for (const c of meta.children) {
                groups.push(this.renderChildGroup(node, schema, c, path, selection));
            }
        }
        // Each row carries the path so the click handler can address it
        // without walking the DOM back up. The trash button is rendered
        // only when the node is selectable (everything except the root —
        // deleting the root clears the tree, exposed via the toolbar).
        const trash = path.length === 0
            ? ""
            : `<button class="sui-tree-action" data-action="delete" data-path='${escapeAttr(JSON.stringify(path))}' title="Delete">×</button>`;
        const row = `<div class="sui-tree-node${isSelected ? " is-selected" : ""}" data-path='${escapeAttr(JSON.stringify(path))}'>` +
            `<span class="sui-tree-type">${escapeHtml(node.type)}</span>` +
            (id ? `<span class="sui-tree-id">#${escapeHtml(id)}</span>` : "") +
            (label ? `<span class="sui-tree-label">${escapeHtml(label)}</span>` : "") +
            `<span class="sui-tree-row-actions">${trash}</span>` +
            `</div>`;
        return row + groups.join("");
    }
    renderChildGroup(node, schema, group, parentPath, selection) {
        const value = node[group.property];
        const addAttrs = `data-action="add" data-parent-path='${escapeAttr(JSON.stringify(parentPath))}' data-property='${escapeAttr(group.property)}'`;
        if (group.cardinality === "SINGLE") {
            // Single-slot child: render at most one child entry beneath the
            // label; the +-button only shows when the slot is empty (adding
            // would replace, which is surprising — the user can delete the
            // existing child first if they want a different one).
            const filled = isUiNode(value);
            const addBtn = filled
                ? ""
                : `<button class="sui-tree-action" ${addAttrs} title="Set ${escapeHtml(group.property)}">+</button>`;
            const child = filled
                ? `<ul><li>${this.renderNode(value, schema, [...parentPath, group.property], selection)}</li></ul>`
                : "";
            return (`<div class="sui-tree-group-label">` +
                `  <span>${escapeHtml(group.property)}</span>` +
                `  ${addBtn}` +
                `</div>` +
                child);
        }
        // LIST cardinality: every entry is a UiNode (UiSectionEntry,
        // UiColumn, UiRow, UiField, …). Render each as a normal tree row;
        // their own child groups (e.g. UiSectionEntry.content) recurse via
        // renderNode → renderChildGroup.
        const list = value;
        const hasChildren = Array.isArray(list) && list.length > 0;
        const items = hasChildren
            ? list
                .map((child, i) => {
                if (!isUiNode(child))
                    return "";
                return `<li>${this.renderNode(child, schema, [...parentPath, group.property, i], selection)}</li>`;
            })
                .join("")
            : "";
        return (`<div class="sui-tree-group-label">` +
            `  <span>${escapeHtml(group.property)}</span>` +
            `  <button class="sui-tree-action" ${addAttrs} title="Add ${escapeHtml(group.property)}">+</button>` +
            `</div>` +
            (hasChildren ? `<ul>${items}</ul>` : ""));
    }
    async onClick(e) {
        const target = e.target;
        if (!target)
            return;
        const setRootBtn = target.closest("[data-action='set-root']");
        if (setRootBtn) {
            await this.setRoot();
            return;
        }
        const deleteBtn = target.closest("[data-action='delete']");
        if (deleteBtn) {
            e.stopPropagation();
            const raw = deleteBtn.dataset.path;
            if (!raw)
                return;
            const path = JSON.parse(raw);
            if (window.confirm("Delete this node?"))
                this.state.deleteAt(path);
            return;
        }
        const addBtn = target.closest("[data-action='add']");
        if (addBtn) {
            e.stopPropagation();
            const parentRaw = addBtn.dataset.parentPath;
            const property = addBtn.dataset.property;
            if (!parentRaw || !property)
                return;
            const parentPath = JSON.parse(parentRaw);
            await this.addChild(parentPath, property);
            return;
        }
        // Otherwise: selecting a row.
        const row = target.closest(".sui-tree-node");
        if (!row || !this.host.contains(row))
            return;
        const raw = row.dataset.path;
        if (raw == null)
            return;
        try {
            const path = JSON.parse(raw);
            this.state.setSelection(path);
        }
        catch (err) {
            console.error("TreeView: bad data-path", err, raw);
        }
    }
    async setRoot() {
        const allTypes = Object.values(this.state.schemaMap);
        const chosen = await pickType(allTypes, "Pick a root node");
        if (!chosen)
            return;
        const node = await loadDefault(chosen);
        this.state.replaceRoot(node);
    }
    async addChild(parentPath, property) {
        const parent = this.state.nodeAt(parentPath);
        if (!parent)
            return;
        const parentMeta = this.state.schemaMap[parent.type];
        const group = parentMeta?.children?.find(c => c.property === property);
        if (!group)
            return;
        const allowed = group.allowedTypes
            .map(t => this.state.schemaMap[t])
            .filter((m) => !!m);
        const chosen = allowed.length === 1
            ? allowed[0].type
            : await pickType(allowed, `Add to ${property}`);
        if (!chosen)
            return;
        const node = await loadDefault(chosen);
        this.state.addChild(parentPath, property, node);
    }
}
// ── helpers ────────────────────────────────────────────────────────────────
function labelFor(node) {
    if (typeof node.title === "string" && node.title)
        return node.title;
    if (typeof node.label === "string" && node.label)
        return node.label;
    if (typeof node.brand === "string" && node.brand)
        return node.brand;
    return "";
}
function isUiNode(value) {
    return value != null && typeof value === "object" && typeof value.type === "string";
}
function samePath(a, b) {
    if (a.length !== b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (a[i] !== b[i])
            return false;
    return true;
}
function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
