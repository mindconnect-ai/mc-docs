export type NodeType = string;
export type UiNodeJson = {
    type: NodeType;
    [key: string]: any;
};
export interface EditorContent {
    root?: UiNodeJson | null;
}
export type PropertyKind = "STRING" | "NUMBER" | "BOOLEAN" | "ENUM" | "STRING_LIST" | "NODE_LIST" | "OBJECT";
export interface PropertyMeta {
    name: string;
    kind: PropertyKind;
    required: boolean;
    enumValues?: string[] | null;
}
export type Cardinality = "LIST" | "SINGLE";
export interface ChildrenMeta {
    /** Name of the property that holds the child(ren) (e.g. "fields", "node"). */
    property: string;
    /** LIST = array of UiNode (default), SINGLE = a single UiNode slot. */
    cardinality: Cardinality;
    /** Type discriminators allowed in this slot. */
    allowedTypes: NodeType[];
}
export interface NodeMeta {
    type: NodeType;
    label: string;
    category: string;
    properties: PropertyMeta[];
    children: ChildrenMeta[];
}
/** Indexable schema map keyed by node type. */
export type Schema = Record<NodeType, NodeMeta>;
