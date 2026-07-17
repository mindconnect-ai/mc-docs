import { escapeHtml, encodeTrigger } from "../renderer.js";
import { renderIcon } from "./icon.js";
/**
 * Renders one UiAction. The {@code appearance} field picks the DOM shape;
 * all variants share the same {@code data-action} / {@code data-trigger} /
 * {@code data-confirm} attributes so the central click dispatcher handles
 * them uniformly.
 */
export function renderAction(a) {
    const style = (a.style || "SECONDARY").toLowerCase();
    const trigger = a.onClick ? `data-trigger='${encodeTrigger(a.onClick)}'` : "";
    const confirm = a.confirm ? `data-confirm="${escapeHtml(a.confirm)}"` : "";
    const title = escapeHtml(a.disabledReason || a.label);
    const enabled = a.enabled !== false;
    const disabled = enabled ? "" : "disabled";
    const appearance = a.appearance || "BUTTON";
    const id = escapeHtml(a.id);
    const label = escapeHtml(a.label);
    // Leading icon for BUTTON/LINK; for ICON the icon replaces the label and
    // the label text becomes the accessible name (aria-label + title).
    const leadingIcon = a.icon ? `${renderIcon(a.icon)} ` : "";
    // id="…" so the editor's id-based selection finds the action element
    // just like any other node. data-action remains the click-handler hook
    // the EventBus reads.
    switch (appearance) {
        case "LINK":
            return `<a id="${id}" href="#" class="sui-link" data-action="${id}" ${trigger} ${confirm} title="${title}">${leadingIcon}${label}</a>`;
        case "ICON": {
            // Icon-only: prefer the named icon; fall back to the label text
            // (keeps legacy emoji-as-label buttons working). aria-label makes
            // the icon-only control accessible.
            const glyph = a.icon
                ? renderIcon(a.icon, { title: a.label })
                : label;
            return `<button id="${id}" type="button" class="sui-icon-btn sui-icon-btn--${style}" data-action="${id}" ${trigger} ${confirm} ${disabled} aria-label="${escapeHtml(a.label)}" title="${title}">${glyph}</button>`;
        }
        case "BUTTON":
        default:
            return `<button id="${id}" type="button" class="sui-btn sui-btn--${style}" data-action="${id}" ${trigger} ${confirm} ${disabled} title="${title}">${leadingIcon}${label}</button>`;
    }
}
