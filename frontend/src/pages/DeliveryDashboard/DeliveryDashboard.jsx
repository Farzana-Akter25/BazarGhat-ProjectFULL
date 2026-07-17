import { useState } from "react";
import DeliverySidebar from "./DeliverySidebar";
import DashboardTab from "./DashboardTab";
import AssignedOrdersTab from "./AssignedOrdersTab";
import DeliveryHistoryTab from "./DeliveryHistoryTab";
import DeliveryRequestsTab from "./DeliveryRequestsTab";
import ProfileTab from "./ProfileTab";
import ResetPasswordTab from "./ResetPasswordTab";

const TABS = {
  dashboard: DashboardTab,
  assigned: AssignedOrdersTab,
  history: DeliveryHistoryTab,
  requests: DeliveryRequestsTab,
  profile: ProfileTab,
  password: ResetPasswordTab,
};

const DeliveryDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const ActiveComponent = TABS[activeTab];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <DeliverySidebar activeTab={activeTab} onChange={setActiveTab} />

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <ActiveComponent onViewAllOrders={() => setActiveTab("assigned")} />
      </main>
    </div>
  );
};

export default DeliveryDashboard;
