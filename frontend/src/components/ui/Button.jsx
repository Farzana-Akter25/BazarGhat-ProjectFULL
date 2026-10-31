// color variants, pick which design a button uses
const VARIANTS = {
  primary: "bg-orange-500 text-white hover:bg-orange-600", // main orange button, used for primary actions
  success: "bg-green-700 text-white hover:bg-green-800", // green button, used for confirm/save actions
  danger: "bg-red-600 text-white hover:bg-red-700", // red button, used for delete/reject actions
  dark: "bg-slate-800 text-white hover:bg-slate-900", // dark/black button, used for secondary strong actions
  secondary: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50", // white button with border, used for cancel/back actions
  ghost: "text-slate-400 hover:text-slate-600", // text-only button, no background, used for minor actions
  ghostDanger: "text-slate-500 hover:bg-red-50 hover:text-red-500", // text-only button that turns red on hover, used for sign out / remove actions
};

// size presets, controls padding + text size
const SIZES = {
  sm: "gap-1.5 px-3 py-2 text-xs", // small button, tight tables/cards
  md: "gap-2 px-4 py-2.5 text-sm", // default size, most forms/pages
  lg: "gap-2 px-5 py-3 text-sm", // large button, hero/CTA areas
};

// content alignment presets
const ALIGN = {
  center: "justify-center", // icon/label centered, default look
  start: "justify-start", // icon/label pinned left, used for full-width menu-style buttons
  between: "justify-between", // icon/label pushed to opposite ends
};

// Reusable button with variants, sizes, icons and a loading state
export default function Button({
  children, // button content passed as JSX
  text, // button content passed as plain text
  icon: Icon, // optional icon shown before the label
  variant = "primary", // which color design to use
  size = "md", // which size design to use
  align = "center", // how content sits inside the button
  fullWidth = false, // stretch button to full container width
  disabled = false, // greys out and blocks clicks
  loading = false, // shows loading text and blocks clicks
  loadingText, // text shown while loading
  type = "button", // html button type (button/submit/reset)
  className = "", // extra classes to append
  ...props // any other native button props (onClick, etc.)
}) {
  return (
    // shared button element, design comes from variant + size + align lookups above
    <button
      type={type}
      disabled={disabled || loading}
      className={`flex items-center rounded-xl font-semibold whitespace-nowrap transition-colors active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${ALIGN[align]} ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {/* optional leading icon, smaller on the sm size */}
      {Icon && <Icon size={size === "sm" ? 13 : 16} />}
      {/* shows loading text while loading, otherwise the normal label */}
      {loading ? loadingText ?? "Loading..." : (children ?? text)}
    </button>
  );
}
