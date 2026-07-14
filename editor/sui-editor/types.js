/*
 * Type aliases for the wire payloads the editor exchanges with the server.
 *
 * Kept loose on purpose: UiNode is `any` because the editor treats nodes as
 * opaque JSON values. The only thing it inspects directly is the `type`
 * discriminator. Specific node-shape knowledge lives in the schema returned
 * by /editor/api/schema (the NodeRegistry on the server side).
 */
export {};
