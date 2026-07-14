import { saveContent } from "./editor-state.js";
export class SaveManager {
    state;
    status = "idle";
    listener = null;
    constructor(state) {
        this.state = state;
        // Every state mutation flips the editor to "dirty" so the toolbar
        // can show an unsaved-changes indicator. The first snapshot fires
        // synchronously from subscribe() with the empty tree; the boot's
        // replaceRoot lands after that. We skip the very first emission so
        // a freshly-loaded tree doesn't show up as dirty right away.
        let seenBoot = false;
        this.state.subscribe(() => {
            if (!seenBoot) {
                seenBoot = true;
                return;
            }
            this.set("dirty");
        });
    }
    onStatus(listener) {
        this.listener = listener;
        // Seed so the toolbar paints the initial state on wire-up.
        listener(this.status);
    }
    /** Triggers an explicit save. Returns true on success, false on failure. */
    async save() {
        this.set("saving");
        try {
            await saveContent({ root: this.state.root ?? undefined });
            this.set("idle");
            return true;
        }
        catch (err) {
            console.error("SUI editor: save failed", err);
            this.set("error");
            return false;
        }
    }
    set(status) {
        if (this.status === status)
            return;
        this.status = status;
        this.listener?.(status);
    }
}
