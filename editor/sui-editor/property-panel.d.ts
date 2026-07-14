import type { EditorState } from "./editor-state.js";
export declare class PropertyPanel {
    private readonly host;
    private readonly state;
    private currentNode;
    private currentPath;
    private lastPathKey;
    private emptyEl;
    private headerEl;
    private editorHost;
    private statusEl;
    private monaco;
    private editor;
    private textarea;
    constructor(host: HTMLElement, state: EditorState);
    private buildShell;
    private initEditor;
    private installTextareaFallback;
    private readValue;
    private writeValue;
    private hasFocus;
    private render;
    /**
     * Pushes the selected node's JSON into the editor. On a node switch we
     * always overwrite; while the same node stays selected we only overwrite
     * when the editor isn't focused (an external mutation from the tree/preview)
     * so we never clobber the user mid-edit.
     */
    private syncValue;
    private apply;
    private peek;
    private setStatus;
}
