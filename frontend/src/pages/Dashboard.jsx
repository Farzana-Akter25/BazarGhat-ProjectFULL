import { LogOut, MapPin, Package, Settings, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  const userData = {
    name: "Farzana", //
    phone: "01947938237",
    email: "farzana@example.com",
    stats: { orders: 24, addresses: 3 },
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 p-6">
        {/* SIDEBAR */}
        <aside className="w-full md:w-64 bg-white p-4 rounded-xl shadow-sm space-y-2 h-fit border border-gray-100">
          {/* ✅ FIXED: Path ekhon "/myprofile" */}
          <button
            onClick={() => navigate("/myprofile")}
            className="flex items-center gap-3 p-3 w-full rounded-lg text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-all font-medium"
          >
            <User size={18} />
            <span>My Profile</span>
          </button>

          <SidebarItem
            icon={<Package size={18} />}
            label="My Orders"
            to="/orderpage"
          />
          <SidebarItem
            icon={<MapPin size={18} />}
            label="Addresses"
            to="/addresses"
          />
          <SidebarItem
            icon={<Settings size={18} />}
            label="Settings"
            to="/settings"
          />

          <div className="pt-4 border-t mt-4">
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-3 p-3 w-full text-red-500 hover:bg-red-50 rounded-lg font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 space-y-6">
          <h1 className="text-3xl font-bold text-gray-800">My Dashboard</h1>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-700">
                {userData.name}
              </h2>
              <p className="text-gray-500">{userData.email}</p>
              <p className="text-gray-500">{userData.phone}</p>
            </div>

            <button
              onClick={() => navigate("/myprofile")}
              className="bg-orange-500 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-orange-600 transition-all shadow-sm"
            >
              View Full Profile
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard count={userData.stats.orders} label="Orders" />
            <StatsCard count={userData.stats.addresses} label="Addresses" />
          </div>
        </main>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon, label, to }) => (
  <Link
    to={to || "#"}
    className="flex items-center gap-3 p-3 rounded-lg text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-all font-medium"
  >
    {icon}
    <span>{label}</span>
  </Link>
);

const StatsCard = ({ count, label }) => (
  <div className="bg-white p-6 rounded-xl text-center shadow-sm border border-gray-50">
    <h3 className="text-3xl font-bold text-orange-600">{count}</h3>
    <p className="text-gray-500 font-medium mt-1">{label}</p>
  </div>
);

export default Dashboard;
