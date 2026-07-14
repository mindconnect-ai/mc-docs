import type { EditorState } from "./editor-state.js";
export declare class TreeView {
    private readonly host;
    private readonly state;
    constructor(host: HTMLElement, state: EditorState);
    private render;
    private renderNode;
    private renderChildGroup;
    private onClick;
    private setRoot;
    private addChild;
}
