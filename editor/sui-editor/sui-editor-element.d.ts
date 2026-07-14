import type { NodeMeta, UiNodeJson } from "./types.js";
/** The node catalogue the editor needs: the type list plus a default per type. */
export interface EditorCatalogue {
    schema: NodeMeta[];
    /** {@code type → a default instance} used when adding a node. */
    defaults: Record<string, UiNodeJson>;
}
/** The edited tree, in and out. */
export interface EditorValue {
    root: UiNodeJson | null;
}
export declare class SuiEditorElement extends HTMLElement {
    private _catalogue;
    private _value;
    private state;
    /** While true, tree mutations don't emit "change" (used for seeding). */
    private suppress;
    get catalogue(): EditorCatalogue | null;
    set catalogue(cat: EditorCatalogue | null);
    get value(): EditorValue;
    set value(v: EditorValue | null);
    connectedCallback(): void;
    /** (Re)builds the panes once both connected and a catalogue is present. */
    private build;
    /** Applies an externally-set value onto a live editor without echoing a change. */
    private applyValue;
}
