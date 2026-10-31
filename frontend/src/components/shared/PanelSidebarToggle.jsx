import { PanelLeftClose, PanelLeftOpen } from "lucide-react"; // show/hide icons

// shared look for the panel top bar controls
export const PANEL_CONTROL_CLASS =
  "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-green-700 hover:text-green-800";

// Show/hide button for a panel sidebar (admin, customer, delivery man).
const PanelSidebarToggle = ({ isOpen, onToggle, className = "" }) => {
  const Icon = isOpen ? PanelLeftClose : PanelLeftOpen; // icon reflects the next action

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={isOpen ? "Hide navigation" : "Show navigation"}
      title={isOpen ? "Hide navigation" : "Show navigation"}
      className={`${PANEL_CONTROL_CLASS} ${className}`}
    >
      <Icon size={16} />
      {isOpen ? "Hide Menu" : "Show Menu"}
    </button>
  );
};

export default PanelSidebarToggle;
