import type { EditorContent, Schema, UiNodeJson } from "./types.js";
/**
 * The four operations the editor needs from its host. Everything else the
 * editor does is client-only (tree mutation, property editing, preview).
 */
export interface EditorBackend {
    /** The node catalogue that drives the add-picker and property panel. */
    loadSchema(): Promise<Schema>;
    /** The tree currently being edited. */
    loadContent(): Promise<EditorContent>;
    /** Persist the whole tree. */
    saveContent(content: EditorContent): Promise<void>;
    /** A fresh default-populated instance of {@code type} (unique id). */
    loadDefault(type: string): Promise<UiNodeJson>;
}
/**
 * The original Spring-backed behaviour: talk to {@code /editor/api/*}. Kept
 * byte-for-byte compatible with the pre-refactor free functions so the
 * Spring-hosted editor is unaffected.
 */
export declare class RestBackend implements EditorBackend {
    private readonly base;
    constructor(base?: string);
    loadSchema(): Promise<Schema>;
    loadContent(): Promise<EditorContent>;
    saveContent(content: EditorContent): Promise<void>;
    loadDefault(type: string): Promise<UiNodeJson>;
}
/** Installs the backend the editor will use. Call before {@link bootEditor}. */
export declare function setBackend(backend: EditorBackend): void;
/** The active backend, defaulting to {@link RestBackend} for Spring hosts. */
export declare function getBackend(): EditorBackend;
