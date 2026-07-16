import { escapeHtml } from "../renderer.js";
import { cls } from "./util.js";
export function renderChart(node) {
    // Charts are typically rendered by a host-provided addon (e.g. a custom
    // handler registered on top). The default leaves a placeholder div with
    // the chart payload exposed via data-* for an addon to pick up.
    const payload = escapeHtml(JSON.stringify({ chartType: node.chartType, data: node.data }));
    return `<div class="${cls("sui-chart", node)}" id="${escapeHtml(node.id)}" data-chart='${payload}'>
        ${node.title ? `<h2>${escapeHtml(node.title)}</h2>` : ""}
    </div>`;
}
