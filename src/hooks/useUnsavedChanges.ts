"use client"

import { useEffect, useCallback } from "react"

/**
 * Warns users before navigating away when they have unsaved changes.
 * Uses the browser's native `beforeunload` event for tab close/refresh,
 * and intercepts link clicks within the app for client-side navigation.
 */
export function useUnsavedChanges(isDirty: boolean) {
  // Browser tab close / refresh
  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  // Intercept clicks on <a> tags for in-app navigation
  useEffect(() => {
    if (!isDirty) return

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a")
      if (!target) return
      // Only intercept same-origin navigation
      if (target.origin !== window.location.origin) return
      // Don't intercept if already going to current page
      if (target.pathname === window.location.pathname) return

      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to leave? Your predictions will not be saved."
      )
      if (!confirmed) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [isDirty])
}
