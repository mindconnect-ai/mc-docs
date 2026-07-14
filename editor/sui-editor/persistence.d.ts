import type { EditorState } from "./editor-state.js";
/**
 * Lifecycle:
 *  - {@code idle}    — server-saved state matches what the editor has.
 *  - {@code dirty}   — local changes not yet flushed to the server.
 *  - {@code saving}  — PUT in flight.
 *  - {@code error}   — last save failed; the editor stays usable, the user
 *                      can retry by clicking Save again.
 */
export type SaveStatus = "idle" | "dirty" | "saving" | "error";
export declare class SaveManager {
    private readonly state;
    private status;
    private listener;
    constructor(state: EditorState);
    onStatus(listener: (status: SaveStatus) => void): void;
    /** Triggers an explicit save. Returns true on success, false on failure. */
    save(): Promise<boolean>;
    private set;
}
