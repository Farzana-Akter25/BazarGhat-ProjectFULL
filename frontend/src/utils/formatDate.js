
// Add a leading zero to single digits
const pad = (n) => String(n).padStart(2, "0");

// dd-mm-yyyy from a Date's local parts
const fromDate = (d) =>
  `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;


// Format any date value as dd-mm-yyyy
export const formatDate = (value) => {
  // Empty value: empty text
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? "" : fromDate(value);

  // Work with the value as text
  const text = String(value).trim();

  
  // "yyyy-mm-dd" or "yyyy-mm-dd hh:mm": swap to dd-mm-yyyy
  const plain = text.match(
    /^(\d{4})-(\d{2})-(\d{2})(?: (\d{1,2}:\d{2}(?::\d{2})?))?$/,
  );
  if (plain)
    return `${plain[3]}-${plain[2]}-${plain[1]}${plain[4] ? ` ${plain[4]}` : ""}`;

  // already day-month-year
  if (/^\d{1,2}-\d{1,2}-\d{4}/.test(text)) return text;

  // "16 Aug 2026, 03:30 PM": reformat the date half, keep the clock time
  const withTime = text.match(/^(.+?),\s*(\d{1,2}:\d{2}.*)$/);
  if (withTime) return `${formatDate(withTime[1])}, ${withTime[2]}`;

  // Anything else the browser can parse
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return fromDate(parsed);

  // Unknown format: show it as it is
  return text;
};

// dd-mm-yyyy plus the clock time, for the ISO timestamps behind timelines and notifications
export const formatDateTime = (value) => {
  if (value === null || value === undefined || value === "") return "";
  // Date object from the value
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDate(value);
  const time = parsed.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${fromDate(parsed)}, ${time}`;
};


// Show how long ago something happened, e.g. "5 minutes ago"
export const formatRelativeTime = (value) => {
  if (value === null || value === undefined || value === "") return "";
  // Date object from the value
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return formatDate(value);

  // Seconds since the date
  const seconds = Math.round((Date.now() - parsed.getTime()) / 1000);

  // A clock a little behind the server would otherwise read "in 3 seconds".
  if (seconds < 60) return "Just now";

  // Minutes under an hour, hours under a day, days under a week
  const units = [
    { limit: 3600, size: 60, name: "minute" },
    { limit: 86400, size: 3600, name: "hour" },
    { limit: 604800, size: 86400, name: "day" },
  ];

  for (const { limit, size, name } of units) {
    if (seconds < limit) {
      const count = Math.floor(seconds / size);
      return `${count} ${name}${count === 1 ? "" : "s"} ago`;
    }
  }

  // Older than a week: show the full date and time
  return formatDateTime(parsed);
};
