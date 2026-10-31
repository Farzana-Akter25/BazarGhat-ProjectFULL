import { useCallback, useEffect, useState } from "react";

// Remembers whether a panel's sidebar is shown.
const usePanelSidebar = (storageKey) => {
  // Start with the saved choice from the browser
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(storageKey) !== "hidden"; // visible unless explicitly hidden
    } catch {
      return true; // storage blocked — fall back to visible
    }
  });

  // persist the current choice
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, isOpen ? "shown" : "hidden");
    } catch {
      // ignore — toggling still works for this session
    }
  }, [storageKey, isOpen]);

  const toggle = useCallback(() => setIsOpen((open) => !open), []); // show/hide the sidebar

  return { isOpen, toggle };
};

export default usePanelSidebar;
