import { LogOut, MapPin, Package, Settings, User } from "lucide-react";
import { Link } from "react-router-dom";

const Sidebar = ({ setShowLogoutModal }) => {
  return (
    <aside className="w-full md:w-64 bg-white p-5 rounded-[30px] shadow-sm space-y-2 h-fit border border-gray-100">
      <div className="mb-6 px-3 py-2">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Menu
        </h3>
      </div>

      {/* Sidebar Items */}
      <SidebarItem
        icon={<User size={20} />}
        label="My Profile"
        to="/myprofile"
      />
      <SidebarItem
        icon={<Package size={20} />}
        label="My Orders"
        to="/orderpage"
      />
      <SidebarItem
        icon={<MapPin size={20} />}
        label="Addresses"
        to="/addresses"
      />
      <SidebarItem
        icon={<Settings size={20} />}
        label="Settings"
        to="/settings"
      />

      {/* Logout Button */}
      <div className="pt-4 border-t border-gray-50 mt-6">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center gap-3 p-4 w-full text-red-500 hover:bg-red-50 rounded-2xl font-bold transition-all group"
        >
          <LogOut
            size={20}
            className="group-hover:translate-x-1 transition-transform"
          />
          Logout
        </button>
      </div>
    </aside>
  );
};

// Internal SidebarItem Component for reuse
const SidebarItem = ({ icon, label, to }) => (
  <Link
    to={to || "#"}
    className="flex items-center gap-3 p-4 rounded-2xl text-gray-600 hover:bg-gray-50 hover:text-orange-600 transition-all font-semibold"
  >
    {icon}
    <span>{label}</span>
  </Link>
);

export default Sidebar;
