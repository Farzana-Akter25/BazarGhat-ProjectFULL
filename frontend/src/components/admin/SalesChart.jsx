
// Short number format for the axis, e.g. 1500 -> "1.5k"
const compact = (n) => {
  const value = Number(n) || 0;
  if (value >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return String(value);
};

// Full amount with "TK"
const money = (n) => `${(Number(n) || 0).toLocaleString()}TK`;


// Round a value up to a tidy axis maximum (1, 2, 2.5, 5 or 10 times a power of ten)
const niceCeil = (value) => {
  if (value <= 0) return 100;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = [1, 2, 2.5, 5, 10].find((s) => normalised <= s) ?? 10;

  return step * magnitude;
};

// Bar chart of sales per day with total, average and best-day figures
const SalesChart = ({ data = [], rangeLabel = "" }) => {
  // Sales value of each day, and the summary numbers
  const values = data.map((d) => Number(d.value) || 0);
  const total = values.reduce((sum, v) => sum + v, 0);
  const peak = Math.max(0, ...values);
  const average = data.length > 0 ? Math.round(total / data.length) : 0;
  const bestDay = data[values.indexOf(peak)];

  const axisTop = niceCeil(peak); // chart's 100% line
  const gridlines = [1, 0.75, 0.5, 0.25, 0]; // top to bottom

  // A 7-day range fits a label per column ("Mon", "Tue", …).
  const maxLabels = data.length <= 10 ? data.length : 6;
  // Show only every Nth date label so they do not overlap
  const labelStep = Math.max(1, Math.ceil(data.length / maxLabels));

  return (
    <div>
      {/* period summary — the three numbers the chart is read for */}
      <div className="mb-5 grid grid-cols-3 gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-[11px] font-medium text-slate-500">Revenue{rangeLabel && ` · ${rangeLabel}`}</p>
          <p className="mt-1 text-lg font-extrabold text-slate-900">{money(total)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-500">Daily average</p>
          <p className="mt-1 text-lg font-extrabold text-slate-900">{money(average)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-500">Best day</p>
          <p className="mt-1 text-lg font-extrabold text-green-700">{money(peak)}</p>
          {peak > 0 && bestDay && (
            <p className="text-[11px] font-medium text-slate-500">{bestDay.date || bestDay.label}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        {/* value axis */}
        <div className="flex h-44 w-10 shrink-0 flex-col justify-between py-0.5 text-right">
          {gridlines.map((g) => (
            <span key={g} className="text-[10px] font-medium text-slate-400">
              {compact(axisTop * g)}
            </span>
          ))}
        </div>

        {/* plot area */}
        <div className="relative min-w-0 flex-1">
          {/* horizontal gridlines behind the columns */}
          <div className="absolute inset-x-0 top-0 h-44">
            {gridlines.map((g) => (
              <div
                key={g}
                className={`absolute inset-x-0 border-t ${
                  g === 0 ? "border-slate-200" : "border-dashed border-slate-100"
                }`}
                style={{ top: `${(1 - g) * 100}%` }}
              />
            ))}
          </div>

          {/* one column per day */}
          <div className="relative flex h-44 items-end gap-[3px]">
            {data.map((d, idx) => {
              // This day's value; the highest bar is highlighted
              const value = Number(d.value) || 0;
              const isPeak = peak > 0 && value === peak;

              return (
                // a button, so the day's detail is reachable by tap and by keyboard too — not hover only
                <button
                  type="button"
                  key={d.label + idx}
                  aria-label={`${d.date || d.label}: ${money(value)}${
                    d.orders !== undefined ? `, ${d.orders} orders` : ""
                  }`}
                  className="group relative flex h-full flex-1 items-end rounded-t-md focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                >
                  {/* faint full-height track, so an empty day still reads as a day */}
                  <div className="absolute inset-0 rounded-t-md bg-slate-50 opacity-0 transition-opacity group-hover:opacity-100" />

                  {/* the bar itself, scaled against the axis top */}
                  <div
                    className={`relative w-full rounded-t-md transition-colors ${
                      value === 0
                        ? "bg-slate-100"
                        : isPeak
                          ? "bg-green-700"
                          : "bg-green-600/70 group-hover:bg-green-700"
                    }`}
                    style={{ height: value === 0 ? "3px" : `${Math.max((value / axisTop) * 100, 2)}%` }}
                  />

                  {/* hover tooltip: exact date, revenue and order count */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-left text-[11px] font-semibold text-white shadow-lg group-hover:block group-focus:block">
                    <p>{d.date || d.label}</p>
                    <p className="text-green-300">{money(value)}</p>
                    {d.orders !== undefined && (
                      <p className="font-medium text-slate-300">
                        {d.orders} {d.orders === 1 ? "order" : "orders"}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Day labels. */}
          <div className="relative mt-2 h-4">
            {data.map((d, idx) => {
              if (idx % labelStep !== 0) return null;

              const centre = ((idx + 0.5) / data.length) * 100; // middle of this column
              const atStart = centre < 8; // keep the first/last labels inside the card
              const atEnd = centre > 92;

              return (
                <span
                  key={d.label + idx}
                  className={`absolute top-0 whitespace-nowrap text-[10px] font-medium text-slate-500 ${
                    atStart ? "" : atEnd ? "-translate-x-full" : "-translate-x-1/2"
                  }`}
                  style={{ left: `${centre}%` }}
                >
                  {d.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* nothing sold in the whole period — say so instead of showing a flat chart with no explanation */}
      {total === 0 ? (
        <p className="mt-3 text-center text-xs font-medium text-slate-500">
          No sales recorded in this period.
        </p>
      ) : (
        // tells the admin the columns are interactive
        <p className="mt-3 text-center text-[11px] text-slate-400">
          Tap or hover a column for that day&apos;s revenue and orders.
        </p>
      )}
    </div>
  );
};

export default SalesChart; // daily revenue chart used on the admin dashboard
