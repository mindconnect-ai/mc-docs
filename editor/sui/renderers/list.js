import { escapeHtml } from "../renderer.js";
import { cls } from "./util.js";
import { renderActions, renderPagination } from "./shared.js";
export function renderList(node, r) {
    const items = (node.items || []).map(item => r.renderItem(item)).join("");
    return `<div class="${cls("sui-list", node)}" id="${escapeHtml(node.id)}">
        <div class="sui-list-header">
            ${node.title ? `<h2>${escapeHtml(node.title)}</h2>` : ""}
            <div class="sui-actions">${renderActions(node.actions || [])}</div>
        </div>
        <ul>${items}</ul>
        ${node.pagination ? renderPagination(node.pagination) : ""}
    </div>`;
}
