

// Format a date as yyyy-mm-dd
const toDateKey = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// resolves a filter preset into the {from, to} date-key bounds sent to the API
export function getPresetRange(preset, customFrom, customTo) {
  // Today's date key
  const todayKey = toDateKey(new Date());

  if (preset === "Today") return { from: todayKey, to: todayKey };

  if (preset === "Last 7 Days") {
    // Last 7 days including today
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return { from: toDateKey(start), to: todayKey };
  }

  if (preset === "Last 30 Days") {
    // Last 30 days including today
    const start = new Date();
    start.setDate(start.getDate() - 29);
    return { from: toDateKey(start), to: todayKey };
  }

  // Custom Date Range
  return { from: customFrom || null, to: customTo || null };
}


// Default range for the custom date picker (last 7 days)
export function getDefaultCustomRange() {
  return getPresetRange("Last 7 Days");
}
