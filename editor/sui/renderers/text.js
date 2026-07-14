import { escapeHtml } from "../renderer.js";
import { cls } from "./util.js";
export function renderText(node) {
    const id = node.id ? ` id="${escapeHtml(node.id)}"` : "";
    return `<span class="${cls("sui-text", node)}"${id}>${escapeHtml(node.text ?? "")}</span>`;
}
