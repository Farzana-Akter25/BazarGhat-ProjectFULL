import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import PanelTopBar from "../../../components/shared/PanelTopBar"; // sidebar toggle + home link
import usePanelSidebar from "../../../hooks/usePanelSidebar"; // remembers the sidebar choice
import DeliverySidebar from "./DeliverySidebar"; // left nav + rider profile
import DashboardTab from "./DashboardTab";
import AssignedOrdersTab from "./AssignedOrdersTab";
import DeliveryHistoryTab from "./DeliveryHistoryTab";
import DeliveryRequestsTab from "./DeliveryRequestsTab";
import ComplaintsTab from "./ComplaintsTab";
import ProfileTab from "./ProfileTab";
import PasswordTab from "./PasswordTab";

// tab key to panel component map
const TABS = {
  dashboard: DashboardTab,
  assigned: AssignedOrdersTab,
  history: DeliveryHistoryTab,
  requests: DeliveryRequestsTab,
  complaints: ComplaintsTab,
  profile: ProfileTab,
  password: PasswordTab,
};

// Delivery man dashboard with a sidebar and tabs
const DeliveryDashboard = () => {
  const [searchParams] = useSearchParams(); // ?tab= deep link, used by notifications
  // A notification click arrives as ?tab=<panel>; anything else opens the default panel.
  const requestedTab = searchParams.get("tab");
  // Open the tab from the URL if valid, otherwise the dashboard tab
  const [activeTab, setActiveTab] = useState(
    requestedTab && TABS[requestedTab] ? requestedTab : "dashboard",
  ); // current sidebar tab

  // Follow the parameter changing while the dashboard is already open.
  const [lastRequestedTab, setLastRequestedTab] = useState(requestedTab);
  if (requestedTab !== lastRequestedTab) {
    setLastRequestedTab(requestedTab);
    if (requestedTab && TABS[requestedTab]) {
      setActiveTab(requestedTab);
    }
  }
  const { isOpen, toggle } = usePanelSidebar("delivery-sidebar"); // sidebar visibility
  const ActiveComponent = TABS[activeTab]; // panel component for current tab

  return (
    // full page bg
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      {/* left delivery sidebar */}
      <DeliverySidebar
        activeTab={activeTab}
        onChange={setActiveTab}
        isOpen={isOpen}
      />

      {/* active tab panel */}
      <main
        className={`min-w-0 flex-1 p-4 sm:p-6 lg:p-8 ${isOpen ? "lg:pl-72" : ""}`}
      >
        {/* sidebar show/hide + home link */}
        <PanelTopBar isOpen={isOpen} onToggle={toggle} className="mb-4" />

        <ActiveComponent onViewAllOrders={() => setActiveTab("assigned")} />
      </main>
    </div>
  );
};

export default DeliveryDashboard;
