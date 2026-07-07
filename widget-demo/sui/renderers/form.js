import { escapeHtml } from "../renderer.js";
import { cls } from "./util.js";
import { renderField } from "./field.js";
import { renderActions, renderLinks } from "./shared.js";
export function renderForm(node) {
    const fields = (node.fields || []).map(renderField).join("");
    // The form needs its own serialised JSON so submit handlers can resolve
    // field metadata without walking the DOM back to the model.
    const nodeJson = escapeHtml(JSON.stringify(node));
    // reloadOnSubmit: opt out of the EventBus's submit interception so the
    // browser does a native full-page navigation. Required for state changes
    // that live outside #sui-root (theme stylesheet, SPA bootstrap script).
    const reload = node.reloadOnSubmit ? ' data-sui-reload="true"' : "";
    // Native submit fallback: mirror form.hbs by writing method+action from
    // the primary action so a reload-on-submit form (or a JS-free browser)
    // can submit the form correctly. Without these the browser would default
    // to GET against the current URL — completely wrong for our POSTs.
    const primary = primaryAction(node);
    const method = (primary?.onClick?.method ?? "GET").toUpperCase();
    const url = primary?.onClick?.url ?? "";
    const tunneled = method !== "GET" && method !== "POST";
    const methodAttr = primary
        ? ` method="${tunneled ? "post" : method.toLowerCase()}" action="${escapeHtml(url)}"`
        : "";
    const methodOverride = tunneled
        ? `<input type="hidden" name="_method" value="${escapeHtml(method)}">`
        : "";
    return `<form class="${cls("sui-form", node)}" id="${escapeHtml(node.id)}" data-sui="form"${reload}${methodAttr} data-node='${nodeJson}'>
        ${methodOverride}
        ${node.title ? `<h2>${escapeHtml(node.title)}</h2>` : ""}
        ${fields}
        <div class="sui-form-footer">
            ${renderActions(node.actions || [])}
            ${renderLinks(node.links || [])}
        </div>
    </form>`;
}
/** Returns the form's primary submit action: first PRIMARY-styled, else first. */
function primaryAction(node) {
    const actions = node.actions ?? [];
    return actions.find(a => a.style === "PRIMARY") ?? actions[0];
}
