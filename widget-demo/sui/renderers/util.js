import { escapeHtml } from "../renderer.js";
export function cls(base, node) {
    return node.cssClass ? `${base} ${escapeHtml(node.cssClass)}` : base;
}
