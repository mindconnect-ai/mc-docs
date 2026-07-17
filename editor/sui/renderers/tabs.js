import { renderIcon } from "./icon.js";
/**
 * Priority-plus overflow for tab bars marked {@code data-overflow="menu"}
 * (from {@code UiSection.tabOverflow = MENU}). The bar stays a single row; any
 * tabs that don't fit collapse into a trailing "⋯ More" dropdown. Re-runs on
 * container resize.
 *
 * <p>Progressive enhancement: the tabs the server renders are plain
 * {@code .sui-tab} anchors/buttons, so without this wiring (or without JS) the
 * bar simply wraps — still fully usable. Call once after
 * {@code renderer.mount(...)}; safe to call again after re-renders (it's
 * idempotent per bar).
 */
export function wireTabOverflow(root = document) {
    root.querySelectorAll('.sui-tabs[data-overflow="menu"]').forEach(setupBar);
}
function setupBar(nav) {
    if (nav.dataset.overflowReady === "true")
        return;
    nav.dataset.overflowReady = "true";
    nav.classList.add("sui-tabs--menu-ready");
    // The "⋯ More" control + its dropdown, appended once at the end of the bar.
    const more = document.createElement("div");
    more.className = "sui-tab-more";
    more.hidden = true;
    more.innerHTML =
        `<button type="button" class="sui-tab-more-btn" aria-haspopup="true" aria-expanded="false">${renderIcon("more")}</button>` +
            `<div class="sui-tab-more-menu" role="menu" hidden></div>`;
    nav.appendChild(more);
    const btn = more.querySelector(".sui-tab-more-btn");
    const menu = more.querySelector(".sui-tab-more-menu");
    const closeMenu = () => { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    const openMenu = () => { menu.hidden = false; btn.setAttribute("aria-expanded", "true"); };
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.hidden ? openMenu() : closeMenu();
    });
    // A tab picked from the dropdown: let the bus switch to it, then tidy up.
    menu.addEventListener("click", (e) => {
        if (e.target.closest(".sui-tab")) {
            closeMenu();
            // Re-run after the bus updates the active class so the "More" button
            // reflects whether the current tab now lives in the overflow.
            requestAnimationFrame(() => layout(nav, more, btn, menu));
        }
    });
    document.addEventListener("click", (e) => {
        if (!more.contains(e.target))
            closeMenu();
    });
    layout(nav, more, btn, menu);
    if (typeof ResizeObserver === "function") {
        new ResizeObserver(() => { closeMenu(); layout(nav, more, btn, menu); }).observe(nav);
    }
}
/**
 * Moves tabs between the bar and the dropdown so the bar fits on one row.
 * First pulls everything back into the bar and measures; if it overflows,
 * moves tabs from the end into the dropdown until it fits.
 */
function layout(nav, more, btn, menu) {
    // Pull every overflowed tab back so we measure the natural width.
    while (menu.firstChild)
        nav.insertBefore(menu.firstChild, more);
    more.hidden = true;
    if (nav.scrollWidth <= nav.clientWidth)
        return; // everything fits
    more.hidden = false;
    // Move real tabs (not the More control) from the end into the dropdown.
    const tabs = () => Array.from(nav.children).filter(c => c !== more && c.classList.contains("sui-tab"));
    let guard = 0;
    while (nav.scrollWidth > nav.clientWidth && guard++ < 100) {
        const list = tabs();
        const last = list[list.length - 1];
        if (!last)
            break;
        menu.insertBefore(last, menu.firstChild); // prepend keeps original order
    }
    // Surface a selection that has been tucked away.
    btn.classList.toggle("active", !!menu.querySelector(".sui-tab.active"));
}
