import { escapeHtml } from "../renderer.js";
import { cls } from "./util.js";
export function renderSection(node, r) {
    // Collapsible sections wrap the regular section body in a <details>
    // disclosure. We recurse with collapseSummary cleared so the inner body
    // renders as normal tab/stack layout.
    if (node.collapseSummary) {
        const body = renderSectionBody({ ...node, collapseSummary: undefined }, r);
        return `<details class="sui-section--collapsible"${node.collapseOpen ? " open" : ""} id="${escapeHtml(node.id)}">
            <summary class="sui-section-summary">${escapeHtml(node.collapseSummary)}</summary>
            ${body}
        </details>`;
    }
    return renderSectionBody(node, r);
}
function renderSectionBody(node, r) {
    // UiSection is a tabbed container: every entry becomes a tab, one panel
    // is visible. For plain composition (header + body stacked) use UiStack.
    //
    // Special case "stack mode": every entry is title-less AND has no
    // href. That's the shape the chat session sends (messages-panel +
    // input-form panel under one parent section, neither named). Rendering
    // it as tabs would produce empty buttons and hide every panel except
    // the first — which manifests as "no chat input shown". Detect that
    // shape and emit all panels visible.
    const titleHtml = node.title ? `<h2>${escapeHtml(node.title)}</h2>` : "";
    const stackOnly = node.sections.length > 0
        && node.sections.every(s => !s.title && !s.href);
    if (stackOnly) {
        const panels = node.sections.map(s => `<div class="sui-panel" id="${escapeHtml(s.id)}">${r.render(s.content)}</div>`).join("");
        return `<div class="${cls("sui-section", node)}" id="${escapeHtml(node.id)}">
            ${titleHtml}
            <div class="sui-panels">${panels}</div>
        </div>`;
    }
    const activeId = node.initialSection || node.sections[0]?.id;
    const tabs = node.sections.map(s => {
        const activeCls = s.id === activeId ? " active" : "";
        if (s.href) {
            // SSR-friendly tab: real anchor. The EventBus intercepts the
            // click via data-href when SPA is active.
            return `<a class="sui-tab${activeCls}" href="${escapeHtml(s.href)}" data-href="${escapeHtml(s.href)}" data-target="${escapeHtml(s.id)}">${escapeHtml(s.title ?? "")}</a>`;
        }
        return `<button class="sui-tab${activeCls}" data-target="${escapeHtml(s.id)}">${escapeHtml(s.title ?? "")}</button>`;
    }).join("");
    const panels = node.sections.map(s => `<div class="sui-panel" id="${escapeHtml(s.id)}" ${s.id !== activeId ? "hidden" : ""}>${r.render(s.content)}</div>`).join("");
    return `<div class="${cls("sui-section", node)}" id="${escapeHtml(node.id)}">
        ${titleHtml}
        <nav class="sui-tabs">${tabs}</nav>
        <div class="sui-panels">${panels}</div>
    </div>`;
}
