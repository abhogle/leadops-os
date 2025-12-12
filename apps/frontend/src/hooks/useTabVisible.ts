"use client";

import { useEffect, useState } from "react";

/**
 * useTabVisible Hook
 *
 * Detects whether the browser tab is currently visible.
 * Used to pause polling when tab is hidden to save resources.
 *
 * @returns boolean - true if tab is visible, false if hidden
 */
export function useTabVisible(): boolean {
  const [isVisible, setIsVisible] = useState(
    typeof document !== "undefined" ? !document.hidden : true
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
