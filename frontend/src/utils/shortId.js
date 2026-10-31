// Reference numbers read like "ORD-20260904-RCRGMZ" or "INV-2026-000072" — too wide for table cells and dropdown rows.
export const shortId = (reference) => {
  // Keep only the last part, e.g. "#RCRGMZ"
  if (!reference) return "";
  const parts = String(reference).split("-");
  return `#${parts[parts.length - 1]}`;
};
