import type { EditorState } from "./editor-state.js";
export declare class Preview {
    private readonly host;
    private readonly state;
    private renderer;
    constructor(host: HTMLElement, state: EditorState);
    /**
     * Editor-mode shim for the rendered DOM:
     *
     * <p>The preview mounts a real {@link SuiRenderer}, so anything it paints
     * has the same {@code data-action} / {@code data-trigger} / form markup
     * as production. We DO NOT install the {@code SuiEventBus} here — that's
     * the simplest way to make sure no fetches fire from preview clicks.
     *
     * <p>Even so, native click side-effects still happen: an {@code <a href>}
     * navigates the browser away, a {@code <button type=submit>} submits its
     * form. To suppress all of those AND turn the click into a tree-selection
     * action, we attach one capture-phase listener on the host. Capture phase
     * matters because it runs before any bubbling handler the renderer's
     * bundle might add later (today there are none, but the editor must stay
     * robust if the core bundle starts attaching local handlers).
     */
    private installClickInterceptor;
    /**
     * Walks up from the clicked element looking for the nearest {@code [id]}
     * — that id matches a node's model id, which we map back to a selection
     * path. Bails to the empty path when nothing is hit (treated as deselect).
     */
    private pathForElement;
    private attachRenderer;
    private render;
    /**
     * If the selection sits inside one or more tabbed sections, programmatically
     * activates the enclosing tab(s) so the selected node is actually visible.
     *
     * <p>A tabbed-section path looks like {@code […, "sections", <index>, …]}
     * — every such pair identifies one section/entry pair we need to switch.
     * Works both when the user selects the {@code UiSectionEntry} itself
     * (path ends right at the pair) and when the selection sits deeper inside
     * the entry's content. We walk the path, recover the section node and
     * the targeted entry at each pair, and toggle the tab DOM exactly the
     * way {@code SuiEventBus.switchTab} would (CSS class {@code active} on
     * the tab + {@code hidden} attribute on the sibling panels).
     */
    private activateTabsForSelection;
    /**
     * Activates the tab whose {@code data-target} matches {@code entryId}
     * inside the section identified by {@code sectionId}. Mirrors the runtime
     * behaviour of {@code SuiEventBus.switchTab} (CSS + hidden attribute) so
     * the preview stays handler-free.
     */
    private activateTab;
    /**
     * Adds the highlight class to the DOM element matching the selected
     * tree node. We look the element up by {@code id} — the renderer's
     * handlers consistently emit {@code id="..."} from the model's id field
     * — and bail silently when nothing matches (e.g. id-less containers
     * like a default UiPage or UiHeader).
     */
    private applyHighlight;
}
