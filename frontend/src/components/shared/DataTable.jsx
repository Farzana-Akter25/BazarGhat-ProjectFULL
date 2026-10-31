
// Header cell style shared by all tables
export const TH =
  "bg-slate-50 px-3 py-3 text-left text-[11px] font-bold tracking-wide text-black uppercase shadow-[inset_0_-1px_0_#e2e8f0]";
// body cell: same padding on every page, top-aligned so tall cells line up
export const TD = "px-3 py-3.5 align-top break-words";

// Table with loading and empty states
const DataTable = ({
  columns, // [{ label, align }] — one entry per column, in order
  isLoading = false,
  loadingText = "Loading...",
  emptyText = "Nothing to show yet.",
  isEmpty = false,
  children, // the <tr> rows
}) => (
  // no sideways scrolling: the table is always as wide as its container
  <div className="rounded-xl border border-slate-200">
    <table className="w-full table-auto text-left text-sm">
      <thead>
        {/* header row */}
        <tr>
          {columns.map((c) => (
            <th
              key={c.label}
              className={`${TH} ${c.align === "right" ? "text-right" : ""}`}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {isLoading && (
          // loading row
          <tr>
            <td
              colSpan={columns.length}
              className="px-4 py-10 text-center text-slate-600"
            >
              {loadingText}
            </td>
          </tr>
        )}
        {!isLoading && isEmpty && (
          // empty state row
          <tr>
            <td
              colSpan={columns.length}
              className="px-4 py-10 text-center text-slate-600"
            >
              {emptyText}
            </td>
          </tr>
        )}
        {!isLoading && !isEmpty && children}
      </tbody>
    </table>
  </div>
);

export default DataTable;
