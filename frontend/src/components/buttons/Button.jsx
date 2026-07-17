export default function Button({
  text = "Click",
  width = "w-auto",
  color = "text-slate-700",
  bg = "bg-white",
  height = "h-auto",
}) {
  return (
    <button
      className={`${bg} ${color} ${width} ${height} flex items-center leading-none rounded-lg border border-gray-300 px-3.5 whitespace-nowrap transition-all active:scale-95`}
    >
      <span>{text}</span>
    </button>
  );
}
