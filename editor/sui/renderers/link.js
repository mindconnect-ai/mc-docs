import { escapeHtml } from "../renderer.js";
import { cls } from "./util.js";
/**
 * Renders a single {@link UiLink} as a standalone {@code <a>}. The wrapper
 * id="…" follows the same convention as every other node type, so the
 * editor's id-based selection finds it. {@code href} drives the navigation;
 * {@code data-href} is a hint the EventBus reads to route via the SPA when
 * present.
 *
 * <p>Cast through {@code any} for {@code id} because the TS {@link UiLink}
 * interface omits the UiNode-inherited id field (Java-side it's there).
 * The runtime payload always carries it from the server.
 */
export function renderLink(node) {
    const id = node.id;
    const idAttr = id ? ` id="${escapeHtml(id)}"` : "";
    const href = escapeHtml(node.href ?? "#");
    // External links open in a new browser tab. We deliberately OMIT
    // data-href so the EventBus click handler doesn't intercept and SPA-route
    // them — target="_blank" only works when the native click is allowed
    // through.
    if (node.external) {
        return `<a${idAttr} class="${cls("sui-link", node)}" href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(node.label ?? "")}</a>`;
    }
    return `<a${idAttr} class="${cls("sui-link", node)}" href="${href}" data-href="${href}">${escapeHtml(node.label ?? "")}</a>`;
}
