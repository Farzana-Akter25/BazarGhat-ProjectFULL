import { useState } from "react";
import { customer, STATS } from "./data";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";
import DashboardStats from "./DashboardStats";
import OverviewTab from "./OverviewTab";
import OrdersTab from "./OrdersTab";
import ReturnsTab from "./ReturnsTab";
import ReturnPolicyTab from "./ReturnPolicyTab";
import ProfileTab from "./ProfileTab";
import ResetPasswordTab from "./ResetPasswordTab";

const TABS = {
  overview: OverviewTab,
  orders: OrdersTab,
  returns: ReturnsTab,
  policy: ReturnPolicyTab,
  profile: ProfileTab,
  password: ResetPasswordTab,
};

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const ActiveComponent = TABS[activeTab];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <DashboardHeader customer={customer} />
        <DashboardStats stats={STATS} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <DashboardSidebar activeTab={activeTab} onChange={setActiveTab} />
          </div>
          <div className="lg:col-span-3">
            <ActiveComponent onViewAllOrders={() => setActiveTab("orders")} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
