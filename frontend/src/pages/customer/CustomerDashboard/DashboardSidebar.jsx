import {
  FileText,
  KeyRound,
  LayoutGrid,
  MessageSquareWarning,
  Package,
  RotateCcw,
  User,
  Wallet,
} from "lucide-react"; // sidebar nav icons

// sidebar nav groups
const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { key: "overview", label: "Dashboard", icon: LayoutGrid },
      { key: "orders", label: "My Orders", icon: Package },
      { key: "returns", label: "Return and Refund", icon: RotateCcw },
      { key: "wallet", label: "Refund Wallet", icon: Wallet },
      { key: "complaints", label: "Complaints", icon: MessageSquareWarning },
      { key: "profile", label: "Profile", icon: User },
      { key: "password", label: "Reset Password", icon: KeyRound },
    ],
  },
  {
    label: "Support",
    items: [{ key: "policy", label: "Return and Refund Policy", icon: FileText }],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((group) => group.items); // flat list for mobile pill nav

const DashboardSidebar = ({ activeTab, onChange, isOpen = true }) => { // isOpen: false hides the whole sidebar
  if (!isOpen) return null; // hidden by the panel toggle

  return (
    <>
      {/* desktop fixed sidebar */}
      <aside className="fixed left-0 top-0 z-10 hidden h-screen w-64 flex-col bg-green-900 lg:flex">
        {/* sidebar title */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div>
            <h1 className="text-base font-black leading-tight text-white">
              My Account
            </h1>
          </div>
        </div>

        {/* nav groups list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mb-5">
              {/* group label */}
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[1.5px] text-white">
                {group.label}
              </p>
              <div className="space-y-1">
                {/* nav item, green when active */}
                {group.items.map((item) => {
                  const isActive = activeTab === item.key; // is this the current tab
                  return (
                    <button
                      key={item.key}
                      onClick={() => onChange(item.key)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? "bg-green-700 font-semibold text-white shadow-sm"
                          : "font-medium text-white hover:bg-orange-500/10 hover:text-orange-400"
                      }`}
                    >
                      {/* nav icon */}
                      <item.icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile nav — the fixed sidebar is desktop-only (lg:flex), so small screens get a scrollable pill bar instead */}
      <nav className="scrollbar-overlay flex gap-2 overflow-x-auto bg-green-900 px-4 py-3 sm:px-6 lg:hidden">
        {/* mobile pill nav item */}
        {ALL_ITEMS.map((item) => {
          const isActive = activeTab === item.key; // is this the current tab
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-green-700 text-white"
                  : "bg-white/5 text-white hover:bg-orange-500/10 hover:text-orange-400"
              }`}
            >
              {/* pill icon */}
              <item.icon size={14} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default DashboardSidebar;
