import type { EditorContent, Schema, UiNodeJson } from "./types.js";
/** Selection path as a sequence of property/index hops from the root. */
export type SelectionPath = ReadonlyArray<string | number>;
export interface EditorSnapshot {
    readonly root: UiNodeJson | null;
    readonly selection: SelectionPath;
    readonly schema: Schema;
}
export type EditorListener = (snapshot: EditorSnapshot) => void;
export declare class EditorState {
    private readonly schema;
    private rootNode;
    private selection;
    private readonly listeners;
    constructor(schema: Schema);
    get root(): UiNodeJson | null;
    get selectionPath(): SelectionPath;
    get schemaMap(): Schema;
    snapshot(): EditorSnapshot;
    /**
     * Walks the tree along the current selection and returns the node it
     * points at — {@code null} when the selection is empty or the path is
     * stale (e.g. a parent was just deleted). Read-only: views must not
     * mutate the returned reference.
     */
    selectedNode(): UiNodeJson | null;
    nodeAt(path: SelectionPath): UiNodeJson | null;
    /**
     * Like nodeAt() but returns *anything* at the path — including arrays and
     * entry-wrapper objects without a type discriminator. Used by mutators
     * that need to address the parent of a list entry (where parent itself is
     * an array, not a UiNode).
     */
    private rawAt;
    /**
     * Replaces the whole tree. Used after the initial GET /editor/api/state
     * and as a recovery hatch when the JSON editor rewrites the root.
     * Pass {@code keepSelection=true} to retain the previous selection path
     * (e.g. for in-place JSON edits of the selected node).
     */
    replaceRoot(root: UiNodeJson | null, keepSelection?: boolean): void;
    /** Moves selection. Pass {@code []} to deselect. */
    setSelection(path: SelectionPath): void;
    /**
     * Adds a node into a child slot. The {@code parentPath} points at the
     * container; {@code property} names the slot (e.g. {@code "fields"} or
     * {@code "node"}). For LIST slots the new node lands at the end; for
     * SINGLE slots the new node replaces whatever was there. The new node
     * becomes the selection so the user can edit it immediately.
     */
    addChild(parentPath: SelectionPath, property: string, node: UiNodeJson): void;
    /**
     * Walks the entire tree and returns the set of ids that appear more
     * than once. Used by the property panel and add operations to surface
     * collisions after a mutation — we don't block the mutation, just warn
     * (id uniqueness is an authoring concern, not a hard model invariant).
     */
    findDuplicateIds(): Set<string>;
    /**
     * Deletes the node at {@code path}. Three cases — exact, no guessing:
     * <ul>
     *   <li>Root path ({@code []}) — clears the whole tree.</li>
     *   <li>Numeric last hop — splices the parent array.</li>
     *   <li>String last hop — clears the named single-slot property.</li>
     * </ul>
     * <p>Callers are responsible for passing the path of the thing they want
     * gone: the tree view's trash-button on an entry-wrapper row already
     * uses the wrapper's array-index path, and the trash on a wrapper's
     * content uses the {@code [..., "<contentProp>"]} path. {@code deleteAt}
     * therefore never has to guess which one was meant — earlier "entry-
     * wrapper" heuristic clobbered the wrapper whenever the user merely
     * wanted to remove the inner node.
     * <p>Selection collapses to the parent in every case.
     */
    deleteAt(path: SelectionPath): void;
    /**
     * Replaces the node at {@code path} with a new JSON object — used by the
     * JSON editor and by any future property-panel field-by-field updates.
     * Preserves selection so the user keeps editing the same node.
     */
    replaceAt(path: SelectionPath, replacement: UiNodeJson): void;
    /** Returns an unsubscribe function. */
    subscribe(listener: EditorListener): () => void;
    private emit;
}
export declare function loadSchema(): Promise<Schema>;
export declare function loadContent(): Promise<EditorContent>;
export declare function saveContent(content: EditorContent): Promise<void>;
/**
 * A fresh default instance of {@code type}. With the REST backend the server
 * runs the {@code NodeRegistry} factory; with the localStorage backend a
 * bundled default (dumped from that same registry) is cloned with a fresh id.
 * Either way the node arrives with sensible ids/labels/booleans filled in.
 */
export declare function loadDefault(type: string): Promise<UiNodeJson>;
