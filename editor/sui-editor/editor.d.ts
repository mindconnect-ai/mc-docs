import { type EditorBackend } from "./backend.js";
export interface BootEditorOptions {
    /** Element id to mount into. Defaults to {@code sui-editor-root}. */
    rootId?: string;
    /** Backend to install before loading. Defaults to the REST backend. */
    backend?: EditorBackend;
    /** When set, the toolbar shows a "back" button that invokes this. */
    onExit?: () => void;
    /**
     * When set, the toolbar shows a "Preview" button. The editor saves the
     * current tree first (so the preview reflects what's on screen) and then
     * invokes this — the embedder mounts a live preview of the page.
     */
    onPreview?: () => void;
    /** Toolbar heading. Defaults to "SUI Editor". */
    title?: string;
}
/**
 * Boots an editor instance into {@code opts.rootId}. Returns once the panes
 * are wired and the initial tree is loaded. Safe to call repeatedly against
 * different hosts (the standalone app re-mounts when switching pages).
 */
export declare function bootEditor(opts?: BootEditorOptions): Promise<void>;
