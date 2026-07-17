import {
  CreditCard,
  Gift,
  LogOut,
  MapPin,
  Package,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const CustomerSidebar = ({ onLogout, userName = "Farzana" }) => {
  const location = useLocation();

  // মেনু আইটেমগুলোর লিস্ট
  const menuItems = [
    { icon: <User size={18} />, label: "Profile Overview", to: "/myprofile" },
    { icon: <Package size={18} />, label: "Order History", to: "/orderpage" },
    {
      icon: <CreditCard size={18} />,
      label: "Payment Methods",
      to: "/payments",
    },
    { icon: <MapPin size={18} />, label: "My Addresses", to: "/addresses" },
    {
      icon: <Settings size={18} />,
      label: "Account Settings",
      to: "/settings",
    },
  ];

  return (
    <aside className="w-full md:w-80 space-y-6">
      {/* মেইন সাইডবার কার্ড */}
      <div className="bg-white p-6 rounded-[45px] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-gray-50 relative overflow-hidden h-fit">
        {/* ইউজার প্রোফাইল হাইলাইট */}
        <div className="flex items-center gap-4 mb-8 p-2">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl rotate-3 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-100">
            {userName[0]}
          </div>
          <div>
            <h4 className="font-black text-lg leading-tight text-gray-900">
              {userName}
            </h4>
            <div className="flex items-center gap-1 text-green-500 font-bold text-[10px] uppercase tracking-wider">
              <ShieldCheck size={10} /> Verified Buyer
            </div>
          </div>
        </div>

        {/* নেভিগেশন লিঙ্কস */}
        <nav className="space-y-1">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={index}
                to={item.to}
                className={`flex items-center gap-4 p-4 rounded-[22px] transition-all duration-300 font-bold group ${
                  isActive
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-100"
                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span
                  className={`transition-transform duration-500 ${isActive ? "scale-110" : "group-hover:scale-125 group-hover:rotate-6"}`}
                >
                  {item.icon}
                </span>
                <span className="text-sm tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* লগআউট বাটন সেকশন */}
        <div className="pt-6 border-t border-gray-50 mt-6 px-2">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 py-4 w-full text-gray-400 hover:text-red-500 transition-all font-bold group"
          >
            <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-red-50 group-hover:text-white group-hover:rotate-12 transition-all duration-300">
              <LogOut size={18} />
            </div>
            Sign Out
          </button>
        </div>
      </div>

      {/* প্রিমিয়াম অফার কার্ড (সাইডবারের নিচে) */}
      <div className="hidden md:block bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group cursor-pointer">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
          <Gift size={80} />
        </div>
        <div className="relative z-10">
          <span className="bg-orange-500 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest mb-4 inline-block">
            Loyalty Club
          </span>
          <h4 className="font-black text-xl mb-2 leading-tight">
            Get Free <br /> Delivery!
          </h4>
          <p className="text-gray-400 text-xs font-medium mb-6 leading-relaxed">
            Upgrade to VIP status and save ৳500 on every order.
          </p>
          <button className="bg-white text-gray-900 text-[10px] font-black px-6 py-3 rounded-xl hover:bg-orange-500 hover:text-white transition-all w-full uppercase tracking-tighter">
            Check Benefits
          </button>
        </div>
      </div>
    </aside>
  );
};

export default CustomerSidebar;
