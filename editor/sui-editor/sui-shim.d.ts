export type SuiMorpher = (target: HTMLElement, html: string, mode: "innerHTML" | "outerHTML") => void;
export interface SuiRendererLike {
    mount(node: {
        type: string;
    } | null | undefined): unknown;
    render(node: {
        type: string;
    } | null | undefined): string;
    setMorpher?(morpher: SuiMorpher): unknown;
}
export interface SuiRendererCtor {
    new (rootElement?: HTMLElement): SuiRendererLike;
}
export interface SuiRendererModule {
    SuiRenderer: SuiRendererCtor;
    installDefaultHandlers(renderer: SuiRendererLike): SuiRendererLike;
}
