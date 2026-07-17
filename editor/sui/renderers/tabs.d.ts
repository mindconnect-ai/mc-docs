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
export declare function wireTabOverflow(root?: ParentNode): void;
