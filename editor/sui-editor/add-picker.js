export function pickType(options, title) {
    return new Promise((resolve) => {
        const dialog = document.createElement("dialog");
        dialog.className = "sui-editor-picker";
        dialog.innerHTML =
            `<form method="dialog" class="sui-editor-picker-body">` +
                `  <h3>${escapeHtml(title)}</h3>` +
                `  <ul class="sui-editor-picker-list">` +
                options.map(o => `<li><button type="button" data-type="${escapeAttr(o.type)}">` +
                    `  <span class="sui-tree-type">${escapeHtml(o.type)}</span>` +
                    `  <span>${escapeHtml(o.label)}</span>` +
                    `  <small>${escapeHtml(o.category)}</small>` +
                    `</button></li>`).join("") +
                `  </ul>` +
                `  <menu><button type="button" data-action="cancel">Cancel</button></menu>` +
                `</form>`;
        document.body.appendChild(dialog);
        const cleanup = (result) => {
            dialog.close();
            dialog.remove();
            resolve(result);
        };
        dialog.addEventListener("click", (e) => {
            const target = e.target;
            if (!target)
                return;
            // Backdrop click closes (the form's bounding rect doesn't cover the backdrop).
            const rect = dialog.getBoundingClientRect();
            const insideDialog = e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom;
            if (!insideDialog) {
                cleanup(null);
                return;
            }
            const cancelBtn = target.closest("[data-action='cancel']");
            if (cancelBtn) {
                cleanup(null);
                return;
            }
            const typeBtn = target.closest("button[data-type]");
            if (typeBtn) {
                cleanup(typeBtn.dataset.type ?? null);
            }
        });
        dialog.addEventListener("cancel", () => cleanup(null));
        dialog.showModal();
    });
}
function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s) {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
