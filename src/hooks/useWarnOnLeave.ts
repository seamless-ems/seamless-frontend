import { useEffect } from "react";

/**
 * Warns the user before they navigate away or close the tab when there are unsaved changes.
 * Uses the native browser beforeunload dialog (works with BrowserRouter).
 */
export function useWarnOnLeave(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
