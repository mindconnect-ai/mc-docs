import type { UiTree } from "../model.js";
import { type SuiRenderer } from "../renderer.js";
/**
 * Renders a {@link UiTree}: a list of recursive {@link UiTreeNode}s.
 *
 * <p>Each node with children (or {@code content}) renders as a native
 * {@code <details>} disclosure; leaf nodes render as a plain row. Expand /
 * collapse is client-controlled — every disclosure carries
 * {@code data-sui-client-collapse} so the morpher preserves the user's manual
 * open/close across server re-renders; the server only sets the initial state
 * via {@code node.open}.
 *
 * <p>Clicking a node's label fires its {@code onClick} trigger. Because the
 * event bus calls {@code preventDefault()} on {@code [data-trigger]} clicks,
 * the label click does <em>not</em> toggle the row — only the twisty / the rest
 * of the summary does. Leaf nodes and non-clickable labels behave as expected.
 */
export declare function renderTree(node: UiTree, r: SuiRenderer): string;
