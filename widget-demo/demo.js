/*
 * Semantic UI — Widget Showcase (static, backend-free).
 *
 * This whole page is driven by plain JavaScript objects. Each object is a
 * `UiNode` literal — exactly the JSON a server would normally send — and the
 * core `SuiRenderer` turns it into DOM. There is no backend, no fetch, no
 * build step: the renderer and stylesheets are the ones compiled from
 * mc-semantic-ui-core (served here from ./sui/).
 *
 * Every widget is shown with a collapsible "Show code" panel containing two
 * tabs: the JSON the renderer consumes, and the equivalent Java builder code.
 *
 * Answer to "can the renderer load a UiNode straight from JS?" — yes, natively:
 *
 *     import { createDefaultRenderer } from "./sui/renderer.js";
 *     createDefaultRenderer().attach(el).mount({ type: "text", id: "t", text: "hi" });
 */
import { createDefaultRenderer, escapeHtml } from "./sui/renderer.js";
import { SuiEventBus } from "./sui/eventbus.js";

// ── Trigger helpers (mirror UiTrigger.* factories) ──────────────────────────
const go   = (url)               => ({ behavior: "APPLY_RESPONSE", method: "GET", url });
const api  = (method, url)       => ({ behavior: "APPLY_RESPONSE", method, url });
const api3 = (method, url, pay)  => ({ behavior: "APPLY_RESPONSE", method, url, payload: pay });

// ── Small node builders (keep the literals below readable) ──────────────────
const text    = (id, t)           => ({ type: "text", id, text: t });
const heading = (t)               => ({ type: "text", id: `h-${slug(t)}`, text: t, cssClass: "demo-h" });
const stack   = (id, children, o) => ({ type: "stack", id, children, ...o });
const codeNode = (id, code)       => ({ type: "code", id, code });
let _uid = 0;
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `n${_uid++}`;

// A collapsible "Show code" panel with JSON | Java tabs. The JSON is generated
// straight from the node being rendered, so it can never drift from the widget.
function codePanel(id, node, java) {
    const json = JSON.stringify(node, null, 2);
    return {
        type: "section", id: `${id}-code`,
        collapseSummary: "Show code — JSON · Java", collapseOpen: false,
        sections: [
            { type: "section-entry", id: `${id}-json`, title: "JSON", content: codeNode(`${id}-json-c`, json) },
            { type: "section-entry", id: `${id}-java`, title: "Java", content: codeNode(`${id}-java-c`, java) },
        ],
    };
}

// A showcased widget: heading + the widget + its code panel.
function specimen(id, headingText, node, java) {
    return stack(`${id}-wrap`, [heading(headingText), node, codePanel(id, node, java)], { gap: 8 });
}

// ── Page header (chrome) ────────────────────────────────────────────────────
function pageHeader() {
    return { type: "header", id: "demo-header", brand: "Semantic UI", user: { name: "Ada Lovelace", initials: "AL" } };
}

function introNote() {
    return {
        type: "text", id: "demo-intro", cssClass: "demo-intro",
        text: "Every widget below is a plain UiNode. Expand “Show code” under any widget to see the JSON the renderer consumes and the equivalent Java builder. (Server-side defaults such as enabled:true and generated DOM ids may differ slightly from the trimmed JSON shown.)",
    };
}

// ── Tab: Tree ───────────────────────────────────────────────────────────────
function treeTab() {
    const explorer = {
        type: "tree", id: "tree-explorer", title: "File explorer",
        nodes: [
            { id: "t-src", label: "src", icon: "📁", open: true, children: [
                { id: "t-main", label: "main", icon: "📁", open: true, children: [
                    { id: "t-app",  label: "app.ts",  icon: "📄", onClick: go("/files/app.ts") },
                    { id: "t-boot", label: "boot.ts", icon: "📄", onClick: go("/files/boot.ts") },
                    { id: "t-cmp", label: "components", icon: "📁", children: [
                        { id: "t-btn",  label: "Button.ts", icon: "📄", onClick: go("/files/Button.ts") },
                        { id: "t-tree", label: "Tree.ts",   icon: "📄", selected: true, onClick: go("/files/Tree.ts") },
                    ] },
                ] },
                { id: "t-test", label: "test", icon: "📁", children: [
                    { id: "t-spec", label: "app.spec.ts", icon: "📄", onClick: go("/files/app.spec.ts") },
                ] },
            ] },
            { id: "t-readme", label: "README.md", icon: "📄", onClick: go("/files/README.md") },
            { id: "t-pom",    label: "pom.xml",   icon: "📄", onClick: go("/files/pom.xml") },
        ],
    };
    const explorerJava =
`UiTree.of("tree-explorer", "File explorer")
    .node(UiTree.Node.of("t-src", "src").icon("📁").open(true)
        .child(UiTree.Node.of("t-main", "main").icon("📁").open(true)
            .child(UiTree.Node.of("t-app",  "app.ts").icon("📄").onClick(UiTrigger.go("/files/app.ts")))
            .child(UiTree.Node.of("t-boot", "boot.ts").icon("📄").onClick(UiTrigger.go("/files/boot.ts")))
            .child(UiTree.Node.of("t-cmp", "components").icon("📁")
                .child(UiTree.Node.of("t-btn",  "Button.ts").icon("📄").onClick(UiTrigger.go("/files/Button.ts")))
                .child(UiTree.Node.of("t-tree", "Tree.ts").icon("📄").selected(true).onClick(UiTrigger.go("/files/Tree.ts")))))
        .child(UiTree.Node.of("t-test", "test").icon("📁")
            .child(UiTree.Node.of("t-spec", "app.spec.ts").icon("📄").onClick(UiTrigger.go("/files/app.spec.ts")))))
    .node(UiTree.Node.of("t-readme", "README.md").icon("📄").onClick(UiTrigger.go("/files/README.md")))
    .node(UiTree.Node.of("t-pom", "pom.xml").icon("📄").onClick(UiTrigger.go("/files/pom.xml")));`;

    const rich = {
        type: "tree", id: "tree-rich", title: "Nodes with rich content",
        nodes: [
            { id: "r-order", label: "Order #1024", icon: "🧾", open: true, content: {
                type: "detail", id: "r-order-detail", fields: [
                    { type: "field", id: "r-cust",   label: "Customer", fieldType: "TEXT",   value: "Grace Hopper" },
                    { type: "field", id: "r-total",  label: "Total",    fieldType: "NUMBER", value: 249.0 },
                    { type: "field", id: "r-status", label: "Status",   fieldType: "TEXT",   value: "Shipped" },
                ],
            } },
            { id: "r-metrics", label: "Metrics", icon: "📊", content: {
                type: "chart", id: "r-chart", chartType: "BAR",
                data: { labels: ["Mon", "Tue", "Wed", "Thu", "Fri"], series: [{ name: "Visits", values: [12, 19, 9, 22, 17] }] },
            }, children: [
                { id: "r-child", label: "Drill down…", icon: "→", onClick: go("/metrics") },
            ] },
        ],
    };
    const richJava =
`var visits = new UiChart.ChartData();
visits.setLabels(List.of("Mon", "Tue", "Wed", "Thu", "Fri"));
var series = new UiChart.ChartData.Series();
series.setName("Visits");
series.setValues(List.of(12, 19, 9, 22, 17));
visits.setSeries(List.of(series));

UiTree.of("tree-rich", "Nodes with rich content")
    .node(UiTree.Node.of("r-order", "Order #1024").icon("🧾").open(true)
        .content(UiDetail.of("r-order-detail", null)
            .field(UiField.text("r-cust",   "Customer", "Grace Hopper"))
            .field(UiField.number("r-total", "Total",    249.0))
            .field(UiField.text("r-status", "Status",   "Shipped"))))
    .node(UiTree.Node.of("r-metrics", "Metrics").icon("📊")
        .content(UiChart.of("r-chart", null, UiChart.ChartType.BAR, visits))
        .child(UiTree.Node.of("r-child", "Drill down…").icon("→").onClick(UiTrigger.go("/metrics"))));`;

    return stack("tab-tree", [
        text("tree-intro", "Nodes with children (or content) render as a native <details> disclosure with client-controlled state: expand/collapse survives re-renders. Click a twisty to toggle; click a label to fire its action."),
        specimen("sp-tree", "Generic Tree — expandable / collapsible nodes", explorer, explorerJava),
        specimen("sp-tree-rich", "Trees can carry any component as node content", rich, richJava),
    ], { gap: 16 });
}

// ── Tab: Lists & tables ─────────────────────────────────────────────────────
function dataTab() {
    const list = {
        type: "list", id: "demo-list", title: "Activity",
        actions: [{ type: "action", id: "list-refresh", label: "Refresh", style: "SECONDARY", onClick: api("POST", "/activity/refresh") }],
        items: [
            { id: "l1", label: "Deployment finished",   description: "web-frontend · 2m ago",        onClick: go("/activity/l1") },
            { id: "l2", label: "New comment on PR #42",  description: "workflow-controller · 14m ago", onClick: go("/activity/l2") },
            { id: "l3", label: "Nightly build", collapseSummary: "3 warnings (click to expand)", collapseClientControlled: true,
              collapseSummaryId: "l3-sum", content: text("l3-body", "Build passed with 3 non-blocking lint warnings.") },
        ],
        pagination: { page: 1, size: 3, total: 42 },
    };
    const listJava =
`UiList.of("demo-list", "Activity")
    .action(UiAction.secondary("list-refresh", "Refresh").onClick(UiTrigger.api("POST", "/activity/refresh")))
    .item(UiList.Item.of("l1", "Deployment finished").description("web-frontend · 2m ago").onClick(UiTrigger.go("/activity/l1")))
    .item(UiList.Item.of("l2", "New comment on PR #42").description("workflow-controller · 14m ago").onClick(UiTrigger.go("/activity/l2")))
    .item(UiList.Item.of("l3", "Nightly build")
        .collapsibleClient("3 warnings (click to expand)", "l3-sum")
        .content(UiText.of("l3-body", "Build passed with 3 non-blocking lint warnings.")))
    .paginate(1, 3, 42);`;

    const table = {
        type: "table", id: "demo-table", title: "Products",
        selectMode: "MULTI", selectedRowIds: ["p2"],
        rowActions: [{ type: "action", id: "row-edit", label: "Edit", style: "SECONDARY", onClick: api("GET", "/products/edit") }],
        columns: [
            { type: "column", id: "col-name",  label: "Name",  dataKey: "name" },
            { type: "column", id: "col-price", label: "Price", dataKey: "price" },
            { type: "column", id: "col-stock", label: "Stock", dataKey: "stock" },
        ],
        rows: [
            { type: "row", id: "p1", data: { name: "Widget", price: "€ 19.00", stock: "128" } },
            { type: "row", id: "p2", data: { name: "Gadget", price: "€ 49.00", stock: "12" } },
            { type: "row", id: "p3", data: { name: "Gizmo",  price: "€ 99.00", stock: "0" } },
        ],
        pagination: { page: 1, size: 3, total: 57 },
    };
    const tableJava =
`UiTable.of("demo-table", "Products")
    .column(UiColumn.of("name", "Name"))
    .column(UiColumn.of("price", "Price"))
    .column(UiColumn.of("stock", "Stock"))
    .row(Map.of("id", "p1", "name", "Widget", "price", "€ 19.00", "stock", "128"))
    .row(Map.of("id", "p2", "name", "Gadget", "price", "€ 49.00", "stock", "12"))
    .row(Map.of("id", "p3", "name", "Gizmo",  "price", "€ 99.00", "stock", "0"))
    .selectMode(UiTable.SelectMode.MULTI)
    .selectedRowIds(List.of("p2"))
    .rowAction(UiAction.secondary("row-edit", "Edit").onClick(UiTrigger.api("GET", "/products/edit")))
    .paginate(1, 3, 57);`;

    return stack("tab-data", [
        specimen("sp-list",  "List — items, collapsible rows, actions, pagination", list, listJava),
        specimen("sp-table", "Table — columns, row selection, row actions, pagination", table, tableJava),
    ], { gap: 16 });
}

// ── Tab: Forms ──────────────────────────────────────────────────────────────
function formsTab() {
    const form = {
        type: "form", id: "demo-form", title: "New product",
        fields: [
            { type: "field", id: "f-name",  label: "Name",        fieldType: "TEXT",     required: true, editable: true, placeholder: "e.g. Widget" },
            { type: "field", id: "f-desc",  label: "Description", fieldType: "TEXTAREA", editable: true, hint: "Markdown supported", placeholder: "Describe the product…" },
            { type: "field", id: "f-price", label: "Price",       fieldType: "NUMBER",   editable: true, value: 19.0, step: "0.01" },
            { type: "field", id: "f-count", label: "In stock",    fieldType: "NUMBER",   editable: true, value: 128, min: "0" },
            { type: "field", id: "f-launch",label: "Launch date", fieldType: "DATE",     editable: true, value: "2026-07-06" },
            { type: "field", id: "f-cat",   label: "Category",    fieldType: "SELECT",   editable: true, value: "tools",
              options: [{ value: "tools", label: "Tools" }, { value: "toys", label: "Toys" }, { value: "home", label: "Home" }] },
            { type: "field", id: "f-tags",  label: "Tags",        fieldType: "MULTISELECT", editable: true,
              options: [{ value: "new", label: "New" }, { value: "sale", label: "Sale" }, { value: "eco", label: "Eco" }] },
            { type: "field", id: "f-active",label: "Active",      fieldType: "BOOLEAN",  editable: true, value: true },
        ],
        actions: [
            { type: "action", id: "f-save",   label: "Save",   style: "PRIMARY",   onClick: api3("POST", "/products", "demo-form") },
            { type: "action", id: "f-cancel", label: "Cancel", style: "SECONDARY", onClick: go("/products") },
            { type: "action", id: "f-delete", label: "Delete", style: "DANGER", confirm: "Delete this product?", onClick: api("DELETE", "/products/1") },
        ],
        links: [{ type: "link", id: "f-help", rel: "ref", href: "#", label: "Need help?" }],
    };
    const formJava =
`UiForm.of("demo-form", "New product")
    .field(UiField.text("f-name", "Name", null).asRequired().asEditable().placeholder("e.g. Widget"))
    .field(UiField.textarea("f-desc", "Description", null).asEditable().hint("Markdown supported").placeholder("Describe the product…"))
    .field(UiField.number("f-price", "Price", 19.0).asEditable().step("0.01"))
    .field(UiField.number("f-count", "In stock", 128).asEditable().min("0"))
    .field(UiField.date("f-launch", "Launch date", "2026-07-06").asEditable())
    .field(UiField.select("f-cat", "Category", "tools", List.of(
        UiField.Option.of("tools", "Tools"), UiField.Option.of("toys", "Toys"), UiField.Option.of("home", "Home"))).asEditable())
    .field(UiField.multiselect("f-tags", "Tags", null, List.of(
        UiField.Option.of("new", "New"), UiField.Option.of("sale", "Sale"), UiField.Option.of("eco", "Eco"))).asEditable())
    .field(UiField.bool("f-active", "Active", true).asEditable())
    .action(UiAction.primary("f-save", "Save").onClick(UiTrigger.api("POST", "/products", "demo-form")))
    .action(UiAction.secondary("f-cancel", "Cancel").onClick(UiTrigger.go("/products")))
    .action(UiAction.danger("f-delete", "Delete").confirm("Delete this product?").onClick(UiTrigger.api("DELETE", "/products/1")))
    .link(UiLink.of("ref", "#", "Need help?"));`;

    const detail = {
        type: "detail", id: "demo-detail", title: "Product detail (read-only)",
        fields: [
            { type: "field", id: "d-name",   label: "Name",   fieldType: "TEXT",    value: "Gadget" },
            { type: "field", id: "d-price",  label: "Price",  fieldType: "NUMBER",  value: 49.0 },
            { type: "field", id: "d-active", label: "Active", fieldType: "BOOLEAN", value: true },
        ],
        links: [{ type: "link", id: "d-more", rel: "ref", href: "#", label: "View history" }],
    };
    const detailJava =
`UiDetail.of("demo-detail", "Product detail (read-only)")
    .field(UiField.text("d-name", "Name", "Gadget"))
    .field(UiField.number("d-price", "Price", 49.0))
    .field(UiField.bool("d-active", "Active", true))
    .link(UiLink.of("ref", "#", "View history"));`;

    return stack("tab-forms", [
        specimen("sp-form",   "Form — field types, action styles, links", form, formJava),
        specimen("sp-detail", "Detail — a read-only definition list", detail, detailJava),
    ], { gap: 16 });
}

// ── Tab: Layout, text, actions, charts ──────────────────────────────────────
function layoutTab() {
    const txt = text("txt-1", "A plain text node — the simplest leaf widget.");
    const txtJava = `UiText.of("txt-1", "A plain text node — the simplest leaf widget.");`;

    const actions = {
        type: "stack", id: "row-actions", direction: "HORIZONTAL", gap: 8, children: [
            { type: "action", id: "btn-primary",   label: "Primary",   style: "PRIMARY",   onClick: api("POST", "/do/primary") },
            { type: "action", id: "btn-secondary", label: "Secondary", style: "SECONDARY", onClick: api("POST", "/do/secondary") },
            { type: "action", id: "btn-danger",    label: "Danger",    style: "DANGER", confirm: "Are you sure?", onClick: api("DELETE", "/do/danger") },
        ],
    };
    const actionsJava =
`UiStack.of(
    UiAction.primary("btn-primary", "Primary").onClick(UiTrigger.api("POST", "/do/primary")),
    UiAction.secondary("btn-secondary", "Secondary").onClick(UiTrigger.api("POST", "/do/secondary")),
    UiAction.danger("btn-danger", "Danger").confirm("Are you sure?").onClick(UiTrigger.api("DELETE", "/do/danger"))
).direction(UiStack.Direction.HORIZONTAL).gap(8);`;

    const links = {
        type: "stack", id: "row-links", direction: "HORIZONTAL", gap: 16, children: [
            { type: "link", id: "lnk-docs", rel: "ref", href: "https://example.com/docs", label: "Documentation" },
            { type: "link", id: "lnk-gh",   rel: "ref", href: "https://example.com/gh",   label: "GitHub" },
        ],
    };
    const linksJava =
`UiStack.of(
    UiLink.of("ref", "https://example.com/docs", "Documentation"),
    UiLink.of("ref", "https://example.com/gh", "GitHub")
).direction(UiStack.Direction.HORIZONTAL).gap(16);`;

    const collapsible = {
        type: "section", id: "demo-collapsible", collapseSummary: "Collapsible section (click to toggle)", collapseOpen: false,
        sections: [{ type: "section-entry", id: "cs-body", content: text("cs-text", "This whole section is wrapped in a disclosure. The server sets the initial open state; the user controls it afterwards.") }],
    };
    const collapsibleJava =
`UiSection.of("demo-collapsible", null)
    .section("cs-body", null, UiText.of("cs-text",
        "This whole section is wrapped in a disclosure. The server sets the initial open state; the user controls it afterwards."))
    .collapsible("Collapsible section (click to toggle)", false);`;

    const charts = {
        type: "stack", id: "row-charts", gap: 12, children: ["BAR", "LINE", "AREA", "DONUT", "PIE"].map((t) => ({
            type: "chart", id: `chart-${t.toLowerCase()}`, title: `${t} chart`, chartType: t,
            data: { labels: ["Q1", "Q2", "Q3", "Q4"], series: [{ name: "Revenue", values: [24, 38, 30, 45] }] },
        })),
    };
    const chartsJava =
`var data = new UiChart.ChartData();
data.setLabels(List.of("Q1", "Q2", "Q3", "Q4"));
var revenue = new UiChart.ChartData.Series();
revenue.setName("Revenue");
revenue.setValues(List.of(24, 38, 30, 45));
data.setSeries(List.of(revenue));

UiStack.of(
    UiChart.of("chart-bar",   "BAR chart",   UiChart.ChartType.BAR,   data),
    UiChart.of("chart-line",  "LINE chart",  UiChart.ChartType.LINE,  data),
    UiChart.of("chart-area",  "AREA chart",  UiChart.ChartType.AREA,  data),
    UiChart.of("chart-donut", "DONUT chart", UiChart.ChartType.DONUT, data),
    UiChart.of("chart-pie",   "PIE chart",   UiChart.ChartType.PIE,   data)
).gap(12);

// Charts render via a host-provided addon; this demo registers a small
// inline-SVG handler on the renderer: renderer.register("chart", …).`;

    return stack("tab-layout", [
        specimen("sp-text",     "Text", txt, txtJava),
        specimen("sp-actions",  "Actions (button styles)", actions, actionsJava),
        specimen("sp-links",    "Links", links, linksJava),
        specimen("sp-collapse", "Collapsible section", collapsible, collapsibleJava),
        specimen("sp-charts",   "Charts (inline-SVG handler registered by the demo)", charts, chartsJava),
    ], { gap: 16 });
}

function buildPage() {
    return stack("demo-root", [
        pageHeader(),
        introNote(),
        {
            type: "section", id: "demo-tabs", initialSection: "sec-tree",
            sections: [
                { type: "section-entry", id: "sec-tree",   title: "Tree",            content: treeTab() },
                { type: "section-entry", id: "sec-data",   title: "Lists & Tables",  content: dataTab() },
                { type: "section-entry", id: "sec-forms",  title: "Forms",           content: formsTab() },
                { type: "section-entry", id: "sec-layout", title: "Layout & Charts", content: layoutTab() },
            ],
        },
    ], { gap: 20 });
}

// ── Custom node renderer: a syntax-neutral code block ───────────────────────
function renderCode(node) {
    return `<pre class="demo-code" id="${escapeHtml(node.id)}"><code>${escapeHtml(node.code)}</code></pre>`;
}

// ── A minimal inline-SVG chart handler ──────────────────────────────────────
// The core's default "chart" renderer only emits a placeholder <div> for a
// host addon to hydrate. Registering our own handler shows how an app plugs a
// custom renderer into the pipeline — and gives the showcase real charts.
const CHART_PALETTE = ["var(--sui-color-primary)", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

function renderDemoChart(node) {
    const data = node.data || { labels: [], series: [] };
    const labels = data.labels || [];
    const values = (data.series && data.series[0] && data.series[0].values) || [];
    const body = (node.chartType === "PIE" || node.chartType === "DONUT")
        ? donutSvg(values, labels, node.chartType === "DONUT")
        : barLineSvg(values, labels, node.chartType);
    const title = node.title ? `<h2>${escapeHtml(node.title)}</h2>` : "";
    return `<div class="sui-chart" id="${escapeHtml(node.id)}">${title}${body}</div>`;
}

function barLineSvg(values, labels, type) {
    const W = 320, H = 160, P = 28;
    const iw = W - 2 * P, ih = H - 2 * P;
    const max = Math.max(1, ...values);
    const n = values.length || 1;
    const baseline = `<line x1="${P}" y1="${P + ih}" x2="${P + iw}" y2="${P + ih}" stroke="var(--sui-color-border-strong)"/>`;
    const xLabels = labels.map((lb, i) => {
        const x = P + (type === "BAR" ? (i + 0.5) * (iw / n) : (n === 1 ? iw / 2 : iw * i / (n - 1)));
        return `<text x="${x.toFixed(1)}" y="${H - 6}" font-size="10" text-anchor="middle" fill="var(--sui-color-text-muted)">${escapeHtml(lb)}</text>`;
    }).join("");

    let plot;
    if (type === "BAR") {
        const gap = iw / n, bw = gap * 0.6;
        plot = values.map((v, i) => {
            const bh = ih * (v / max), x = P + i * gap + (gap - bw) / 2, y = P + ih - bh;
            return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="var(--sui-color-primary)"><title>${escapeHtml(labels[i] ?? "")}: ${v}</title></rect>`;
        }).join("");
    } else {
        const pts = values.map((v, i) => {
            const x = P + (n === 1 ? iw / 2 : iw * i / (n - 1));
            const y = P + ih - ih * (v / max);
            return [x, y];
        });
        const poly = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
        const area = type === "AREA"
            ? `<polygon points="${P},${P + ih} ${poly} ${P + iw},${P + ih}" fill="var(--sui-color-primary-soft)"/>`
            : "";
        const dots = pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="var(--sui-color-primary)"/>`).join("");
        plot = `${area}<polyline points="${poly}" fill="none" stroke="var(--sui-color-primary)" stroke-width="2"/>${dots}`;
    }
    return `<svg viewBox="0 0 ${W} ${H}" role="img">${baseline}${plot}${xLabels}</svg>`;
}

function donutSvg(values, labels, isDonut) {
    const cx = 80, cy = 80;
    const r = isDonut ? 60 : 40;
    const sw = isDonut ? 18 : 80; // pie: stroke wide enough to fill to the centre
    const C = 2 * Math.PI * r;
    const total = values.reduce((a, b) => a + b, 0) || 1;
    let offset = 0;
    const segs = values.map((v, i) => {
        const len = (v / total) * C;
        const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${CHART_PALETTE[i % CHART_PALETTE.length]}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"><title>${escapeHtml(labels[i] ?? "")}: ${v}</title></circle>`;
        offset += len;
        return seg;
    }).join("");
    const legend = labels.map((lb, i) =>
        `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--sui-color-text-body)"><span style="width:10px;height:10px;border-radius:2px;background:${CHART_PALETTE[i % CHART_PALETTE.length]}"></span>${escapeHtml(lb)}</div>`
    ).join("");
    return `<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <svg viewBox="0 0 160 160" role="img" style="width:160px">${segs}</svg>
        <div style="display:flex;flex-direction:column;gap:4px">${legend}</div>
    </div>`;
}

// ── A tiny client-side toast, so triggers give visible feedback ─────────────
function showToast(message) {
    const el = document.createElement("div");
    el.textContent = message;
    el.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);" +
        "background:var(--sui-color-text-strong);color:var(--sui-color-surface);" +
        "padding:8px 14px;border-radius:6px;font-size:13px;box-shadow:var(--sui-shadow-card);z-index:1000;opacity:0;transition:opacity .15s";
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = "1"; });
    setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 200); }, 1600);
}

// Exported so the page tree can be rendered/tested outside the browser too.
export { buildPage, renderDemoChart, renderCode };

// ── Boot ────────────────────────────────────────────────────────────────────
// Guarded so the module can be imported in a non-DOM environment (e.g. a Node
// smoke test that just renders buildPage() to a string).
function boot() {
    const root = document.getElementById("sui-root");
    const renderer = createDefaultRenderer().attach(root);
    renderer.register("chart", renderDemoChart); // custom inline-SVG charts
    renderer.register("code", renderCode);        // custom code-block node

    const bus = new SuiEventBus(renderer, root);
    // No backend: show a toast for every dispatched trigger, and resolve the
    // request to an empty patch so nothing errors on the missing server.
    bus.setFetcher((input, init = {}) => {
        const url = typeof input === "string" ? input : (input && input.url) || "";
        const method = (init && init.method) || "GET";
        showToast(`${method} ${url} — no backend (demo)`);
        return Promise.resolve(new Response('{"patches":[]}', { headers: { "Content-Type": "application/json" } }));
    });

    renderer.mount(buildPage());

    // Theme switcher — toggles the class on <html>; the stylesheets are all loaded.
    const themeSelect = document.getElementById("demo-theme");
    if (themeSelect) {
        themeSelect.addEventListener("change", () => {
            document.documentElement.className = themeSelect.value;
        });
    }
}

if (typeof document !== "undefined") boot();
