export type FieldType = "TEXT" | "TEXTAREA" | "NUMBER" | "CURRENCY" | "PERCENT" | "DATE" | "DATETIME" | "BOOLEAN" | "SELECT" | "MULTISELECT" | "FILE" | "REFERENCE";
export type ActionStyle = "PRIMARY" | "SECONDARY" | "DANGER";
export type ActionAppearance = "BUTTON" | "LINK" | "ICON";
export type ChartType = "LINE" | "BAR" | "PIE" | "DONUT" | "AREA";
export type TriggerBehavior = "APPLY_RESPONSE" | "STREAM" | "DOWNLOAD" | "OPEN_IN_TAB" | "INVOKE" | "PATCH" | "UPLOAD";
export interface UiTrigger {
    /**
     * What the client does with the response. Apps may add custom values
     * (registered via {@code SuiEventBus.registerBehavior}); the union here
     * is intentionally open via the {@code string} fallback.
     */
    behavior?: TriggerBehavior | (string & {});
    method?: string;
    url?: string;
    /** ID of a UiForm-like node whose field values are collected as the JSON body. */
    payload?: string;
    /**
     * Name of a client-side handler registered via
     * {@code SuiEventBus.registerClientHandler}. Only meaningful with
     * {@code behavior: "INVOKE"} — the bus calls the named function instead
     * of fetching a URL, and applies whatever {@code UiPage} / {@code UiPatch}
     * it returns. Lets a screen run entirely in the browser, no backend.
     */
    handler?: string;
    /**
     * An inline {@link UiPatch} applied directly when the trigger fires.
     * Only meaningful with {@code behavior: "PATCH"} — no server call, no JS
     * handler: the patch is baked into the trigger at render time and the bus
     * just applies it. Ideal for static, known-ahead UI logic — e.g. a list
     * row whose click fills a detail panel, or a button that opens a fixed
     * dialog — with zero round-trip.
     */
    patch?: UiPatch;
}
export interface UiNodeBase {
    id: string;
    title?: string;
    cssClass?: string;
}
export interface UiField {
    type: "field";
    id: string;
    label: string;
    /** Semantic input kind: TEXT / SELECT / DATE / … Renamed from {@code type}
     *  so it stops clashing with the polymorphic UiNode discriminator. */
    fieldType: FieldType;
    value?: unknown;
    editable?: boolean;
    required?: boolean;
    placeholder?: string;
    hint?: string;
    /**
     * Leading icon token shown inside the input, before the value (e.g.
     * `"search"` on a filter box, `"calendar"` on a date field). Decorative.
     * See {@link UiIcon}.
     */
    icon?: string;
    validationError?: string;
    options?: Array<{
        value: string;
        label: string;
    }>;
    /**
     * Only meaningful for {@code TEXTAREA}: when true, pressing Enter
     * inside the textarea submits the surrounding form; Shift+Enter
     * still inserts a newline. Used for chat-style inputs.
     */
    submitOnEnter?: boolean;
    /**
     * When true, any value change (typing in a text input, picking a select
     * option, toggling a checkbox) immediately submits the surrounding form.
     * Used for "instant" controls like a theme picker dropdown where the
     * user's selection IS the action — no separate Save button needed.
     */
    submitOnChange?: boolean;
    /**
     * Trigger fired when this control's value changes (typing settles, a
     * select option is picked, a checkbox toggles). Lets a single field
     * drive UI logic on its own — e.g. a checkbox that enables/disables
     * another field, or a select that fills a dependent panel — without
     * submitting the whole form. Dispatched by the {@code SuiEventBus}; the
     * collected form payload rides along, so an {@code INVOKE} handler can
     * read the new value. Takes precedence over {@code submitOnChange}.
     */
    onChange?: UiTrigger;
    /** Only for {@code FILE}: HTML `accept` filter (e.g. `"image/*"`). */
    accept?: string;
    /** Only for {@code FILE}: allow selecting more than one file. */
    multiple?: boolean;
    /** Lower bound for DATE/DATETIME/NUMBER/CURRENCY/PERCENT. */
    min?: string;
    /** Upper bound for the same numeric/date types. */
    max?: string;
    /** Step granularity, e.g. "0.01" for currency. */
    step?: string;
}
export interface UiAction {
    type: "action";
    id: string;
    label: string;
    style?: ActionStyle;
    appearance?: ActionAppearance;
    enabled?: boolean;
    disabledReason?: string;
    confirm?: string;
    onClick?: UiTrigger;
    /**
     * Leading icon token (e.g. `"save"`, `"delete"`). Rendered before the
     * label for BUTTON/LINK; for `appearance: "ICON"` it IS the button and
     * the label becomes the accessible name. See {@link UiIcon}.
     */
    icon?: string;
}
export interface UiLink {
    type: "link";
    /** Optional DOM id — matches the Java UiNode.id field for editor selection. */
    id?: string;
    rel?: string;
    href: string;
    label: string;
    cssClass?: string;
    external?: boolean;
    /** Leading icon token rendered before the label. See {@link UiIcon}. */
    icon?: string;
}
export interface UiListItem {
    id: string;
    label: string;
    /** Optional rich label: rendered as the item header instead of the plain `label` text. */
    labelNode?: UiNode;
    /** Leading icon token rendered before the label. See {@link UiIcon}. */
    icon?: string;
    description?: string;
    href?: string;
    onClick?: UiTrigger;
    content?: UiNode;
    collapseSummary?: string;
    collapseOpen?: boolean;
    collapseSummaryId?: string;
    /** When true the open/closed state is client-owned; renders collapsed + data-sui-client-collapse. */
    collapseClientControlled?: boolean;
    actions?: UiAction[];
}
/**
 * Column descriptor for {@link UiTable}. Carries a UiNode discriminator so the
 * editor can address columns as first-class tree items. The {@code dataKey}
 * is the lookup into row data; when absent the renderer falls back to the
 * column's {@code id} (which is the common case).
 */
export interface UiTableColumn {
    type: "column";
    id: string;
    label?: string;
    dataKey?: string;
    cssClass?: string;
    sortable?: boolean;
    filterable?: boolean;
    /**
     * Per-cell render template. Cloned per row, with {@code {dataKey}}
     * substitutions applied recursively to every string field of every
     * descendant node. Substitution context is the row's data map plus the
     * special key {@code id} (= row.id). Unknown keys are left as-is.
     *
     * <p>DOM ids inside the cloned subtree get a per-row suffix so HTML
     * id uniqueness holds: {@code <template-id>__<row-id>}.
     */
    cellTemplate?: UiNode;
}
/** Bare text node. Used inside cellTemplate or anywhere a label belongs. */
export interface UiText {
    type: "text";
    id?: string;
    text?: string;
    cssClass?: string;
}
/**
 * Standalone icon node — an icon anywhere a {@code UiNode} is accepted (a
 * {@code UiStack} child, a tree/list `labelNode`, a table `cellTemplate`).
 * The convenience `icon` string on {@code UiAction}/{@code UiField}/… covers
 * the common leading-icon case; this node covers free placement.
 *
 * <p>{@code name} is a stable semantic token (`"success"`, `"delete"`) or a
 * raw library id present in the sprite. Resolution is swappable — see
 * `renderers/icon.ts` / {@code IconResolver}. Colour follows
 * {@code currentColor}; size follows the surrounding font (1em). A
 * {@code title} makes it accessible (otherwise it is decorative).
 */
export interface UiIcon {
    type: "icon";
    id?: string;
    /** Icon token: semantic alias (`"delete"`) or raw sprite id (`"trash-2"`). */
    name: string;
    /** Accessible label; when absent the icon is decorative (aria-hidden). */
    title?: string;
    cssClass?: string;
}
/**
 * One row of a {@link UiTable}. The cell values live in {@code data} keyed
 * by {@link UiTableColumn#dataKey} (or {@code id} as fallback). Inherits
 * UiNode-style id so {@code selectedRowId} on the table can target it.
 */
export interface UiTableRow {
    type: "row";
    id?: string;
    data?: Record<string, unknown>;
    cssClass?: string;
}
export interface Pagination {
    page: number;
    size: number;
    total: number;
    /**
     * Trigger template fired when the user clicks a page button. The
     * literal {@code {page}} in the trigger's {@code url} is substituted
     * with the target page number at render time. Optional — without it,
     * pagination renders as static informational text.
     */
    pageTrigger?: UiTrigger;
}
export interface UiForm extends UiNodeBase {
    type: "form";
    fields: UiField[];
    actions?: UiAction[];
    links?: UiLink[];
    /**
     * Optional rich body rendered inside the `<form>` after {@link fields}.
     * Any node — a {@link UiStack} for columns, a {@link UiSection} for tabs,
     * nested groups. The payload is collected by walking every named control
     * in the `<form>` element, so the whole form still submits as one object
     * regardless of layout (and across inactive, merely-hidden tabs). Put the
     * inputs as standalone {@link UiField} nodes inside the content.
     */
    content?: UiNode[];
    /**
     * Form-level error banner, shown above the fields. For cross-field or
     * general errors ("Please fix the errors below", "Save failed") that don't
     * belong to a single field — per-field errors go on {@link UiField#validationError}.
     */
    formError?: string;
    /**
     * When true, the EventBus skips its submit-interception so the browser
     * does a native full-page navigation. Used for state changes whose
     * effect lives outside #sui-root (theme stylesheet swap, SSR/SPA mode
     * switch).
     */
    reloadOnSubmit?: boolean;
}
export interface UiDetail extends UiNodeBase {
    type: "detail";
    fields: UiField[];
    actions?: UiAction[];
    links?: UiLink[];
}
export interface UiTable extends UiNodeBase {
    type: "table";
    columns: UiTableColumn[];
    rows: UiTableRow[];
    pagination?: Pagination;
    actions?: UiAction[];
    rowActions?: UiAction[];
    /** Highlights a single row visually; orthogonal to selectMode. */
    selectedRowId?: string;
    /**
     * Row-selection behaviour. {@code NONE} (default) = no selection column.
     * {@code SINGLE} prepends a radio column; {@code MULTI} prepends a
     * checkbox column. Selection inputs all share
     * {@code name="<table.id>__selection"} so the surrounding form submits
     * the chosen row id(s) under that key.
     */
    selectMode?: "NONE" | "SINGLE" | "MULTI";
    /** Pre-selected row ids — pre-checks the radio/checkbox at render time. */
    selectedRowIds?: string[];
}
export interface UiList extends UiNodeBase {
    type: "list";
    items: UiListItem[];
    pagination?: Pagination;
    actions?: UiAction[];
}
/**
 * One node of a {@link UiTree}. Recursive: a node with {@code children} (or
 * {@code content}) is expandable and renders as a native {@code <details>};
 * a node with neither is a leaf. Mirrors {@code UiTreeNode.java}.
 *
 * <p>A full {@code UiNode} (type {@code "tree-node"}), so each tree row is
 * individually patch-addressable: {@code REPLACE} its id to re-render one
 * row, {@code REMOVE} its id to drop it from the tree.
 */
export interface UiTreeNode extends UiNodeBase {
    type: "tree-node";
    label?: string;
    /** Optional rich label rendered instead of the plain `label` text. */
    labelNode?: UiNode;
    /** Optional leading icon/emoji shown before the label. */
    icon?: string;
    onClick?: UiTrigger;
    /** Optional rich body rendered inside the node (above its children) when expanded. */
    content?: UiNode;
    children?: UiTreeNode[];
    /** Initial expanded state; user toggles override it thereafter (client-controlled). */
    open?: boolean;
    /** Renders the row with a selected/highlighted style. */
    selected?: boolean;
}
export interface UiTree extends UiNodeBase {
    type: "tree";
    nodes: UiTreeNode[];
}
/**
 * Plain composition container — children rendered one after another with no
 * chrome of its own. Parity with {@code UiStack.java}.
 */
export interface UiStack extends UiNodeBase {
    type: "stack";
    children: UiNode[];
    /** Defaults to vertical when unset. */
    direction?: "VERTICAL" | "HORIZONTAL";
    /** CSS gap between children in pixels; falls back to a token default. */
    gap?: number;
}
/**
 * One tab inside a {@link UiSection}. A UiNode in its own right (carries its
 * own {@code id}/{@code title}/{@code cssClass}) so the editor can address
 * it like any other tree item. {@code href} (optional) turns the tab into
 * a real navigation link — clicking it switches the URL rather than
 * swapping a hidden panel into view.
 */
export interface UiSectionEntry extends UiNodeBase {
    type: "section-entry";
    content: UiNode;
    href?: string;
    /** Leading icon token shown before the tab label. See {@link UiIcon}. */
    icon?: string;
}
export interface UiSection extends UiNodeBase {
    type: "section";
    sections: UiSectionEntry[];
    initialSection?: string;
    collapseSummary?: string;
    collapseOpen?: boolean;
}
export interface UiChart extends UiNodeBase {
    type: "chart";
    chartType: ChartType;
    data: {
        labels: string[];
        series: Array<{
            name: string;
            values: number[];
        }>;
    };
}
/**
 * Page-level chrome: brand on the left, optional extras + user widget on
 * the right. Parity with {@code UiHeader.java} / {@code header.hbs}.
 */
export interface UiHeader extends UiNodeBase {
    type: "header";
    brand: string;
    brandHref?: string;
    /** Optional logo image URL rendered to the left of the brand text. */
    brandLogo?: string;
    user?: UiHeaderUser;
    /** Extra widgets rendered between brand and user widget (e.g. theme picker). */
    extras?: UiNode[];
}
export interface UiHeaderUser {
    name: string;
    initials: string;
    profileHref?: string;
}
/**
 * Drag-and-drop file-upload area. Renders a drop zone with a browse button and
 * a hidden `<input type="file">`. When files are dropped or picked, the bus
 * fires {@link UiUpload#onUpload}: an `UPLOAD` trigger POSTs them as
 * multipart/form-data; an `INVOKE` trigger hands the `File[]` to a client
 * handler (via {@code ctx.files}) for a backend-free preview. Mirrors
 * {@code UiUpload.java}.
 */
export interface UiUpload extends UiNodeBase {
    type: "upload";
    label?: string;
    hint?: string;
    /** Multipart field name; defaults to the node id. */
    name?: string;
    /** HTML `accept` filter (e.g. `"image/*"` or `".pdf,.docx"`). */
    accept?: string;
    multiple?: boolean;
    /** Browse-button label; defaults to "Browse…". */
    buttonLabel?: string;
    /** Drop-zone prompt; defaults to "Drag files here or". */
    dropText?: string;
    onUpload?: UiTrigger;
}
/**
 * A titled group of related fields, rendered as a `<fieldset><legend>`. The
 * body holds any node (usually {@link UiField}s). Transparent to submission —
 * the fields inside still ride along in the single form payload. Mirrors
 * {@code UiFieldGroup.java}.
 */
export interface UiFieldGroup extends UiNodeBase {
    type: "fieldgroup";
    hint?: string;
    content?: UiNode[];
}
export type UiNode = UiForm | UiFieldGroup | UiDetail | UiTable | UiList | UiTree | UiTreeNode | UiSection | UiStack | UiChart | UiHeader | UiText | UiIcon | UiLink | UiAction | UiField | UiDialog | UiUpload;
export interface UiPage {
    navigate?: string;
    node?: UiNode;
    /** Transient toasts to surface alongside the page content. */
    toasts?: UiToast[];
    /**
     * Dialogs open on this page. Each is a {@link UiDialog} node identified by
     * its id; the bus paints them into the body-level `#sui-dialogs` host on
     * every applyPage. Opening one later is an APPEND into that host, closing
     * it a REMOVE by id.
     */
    dialogs?: UiDialog[];
    /**
     * Server-known SSE streams the SPA may want to re-attach to. On every
     * applyPage the bus walks this list and opens a GET reconnect for any
     * channelId it doesn't already have a live reader for — survives
     * navigations, F5, and second tabs joining the same session.
     */
    activeStreams?: UiPageActiveStream[];
}
/**
 * A modal dialog overlay — a first-class UiNode (mirrors UiDialog.java).
 * Rendered as a fixed-position overlay wherever it sits in the tree, so it is
 * opened by APPENDing it into the `#sui-dialogs` host and closed by REMOVE-ing
 * it by id. Pages declare their initially-open dialogs in `UiPage.dialogs`;
 * there is no singular `dialog` field or `closeDialog` flag any more, and
 * several dialogs can be stacked, each addressed by its own id.
 */
export interface UiDialog extends UiNodeBase {
    type: "dialog";
    /** URL the close button navigates to (SSR closes by navigation). */
    closeHref?: string;
    /** The dialog body. Same UiNode types as a regular page node. */
    node?: UiNode;
}
export interface UiPageActiveStream {
    channelId: string;
    /** GET endpoint that opens a fresh SSE connection and replays missed events. */
    resumeUrl: string;
    label?: string;
    returnHref?: string;
}
export type PatchOp = "REPLACE" | "APPEND" | "CLEAR" | "REMOVE";
export interface UiPatchOperation {
    op: PatchOp;
    targetId: string;
    /** Required for REPLACE and APPEND, omitted for CLEAR and REMOVE. */
    node?: UiNode | {
        type: string;
        [k: string]: unknown;
    };
}
export interface UiPatch {
    patches: UiPatchOperation[];
    /** Toasts to display alongside the patch operations. */
    toasts?: UiToast[];
}
export type UiToastLevel = "INFO" | "SUCCESS" | "WARN" | "ERROR";
export interface UiToast {
    level: UiToastLevel;
    title?: string;
    message: string;
    /** Auto-dismiss timeout in ms. 0 = sticky (user-dismiss only). */
    durationMs: number;
}
