import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import OrderConfirmedModal from "../../../components/customer/OrderConfirmedModal"; // order success popup
import PanelTopBar from "../../../components/shared/PanelTopBar"; // sidebar toggle + home link
import usePanelSidebar from "../../../hooks/usePanelSidebar"; // remembers the sidebar choice
import { useGetMyOrdersQuery } from "../../../features/customer/orderApi";
import useAuth from "../../../hooks/useAuth";
import { buildConfirmedOrder } from "../../../utils/confirmedOrder"; // paid order -> popup payload
import ComplaintsTab from "./ComplaintsTab";
import DashboardHeader from "./DashboardHeader"; // welcome banner
import DashboardSidebar from "./DashboardSidebar"; // left nav
import DashboardStats from "./DashboardStats"; // stat summary cards
import OrdersTab from "./OrdersTab";
import OverviewTab from "./OverviewTab";
import PasswordTab from "./PasswordTab";
import ProfileTab from "./ProfileTab";
import ReturnPolicyTab from "./ReturnPolicyTab";
import ReturnsTab from "./ReturnsTab";
import WalletTab from "./WalletTab";

// tab key to panel component map
const TABS = {
  overview: OverviewTab,
  orders: OrdersTab,
  returns: ReturnsTab,
  wallet: WalletTab,
  complaints: ComplaintsTab,
  policy: ReturnPolicyTab,
  profile: ProfileTab,
  password: PasswordTab,
};

// Customer dashboard with a sidebar and tabs
const CustomerDashboard = () => {
  const { user } = useAuth(); // logged-in customer
  const navigate = useNavigate(); // "Shop Now" from the refund wallet
  const [searchParams, setSearchParams] = useSearchParams(); // ?tab= deep link, used by notifications
  // A notification click arrives as ?tab=<panel>; anything else opens the default panel.
  const requestedTab = searchParams.get("tab");
  // Open the tab from the URL (?tab=...) if valid, otherwise Overview
  const [activeTab, setActiveTab] = useState(
    requestedTab && TABS[requestedTab] ? requestedTab : "overview",
  ); // current sidebar tab

  // Follow the parameter changing while the dashboard is already open.
  const [lastRequestedTab, setLastRequestedTab] = useState(requestedTab);
  if (requestedTab !== lastRequestedTab) {
    setLastRequestedTab(requestedTab);
    if (requestedTab && TABS[requestedTab]) {
      setActiveTab(requestedTab);
    }
  }
  const [returnPresetOrderId, setReturnPresetOrderId] = useState(null); // order preselected for return flow
  const [returnPresetType, setReturnPresetType] = useState("Return"); // Return | Refund preset
  const { isOpen, toggle } = usePanelSidebar("customer-sidebar"); // sidebar visibility

  const { data: orders = [], isLoading: ordersLoading } = useGetMyOrdersQuery(); // customer's order history

  // Payment gateway return leg: SSLCommerz sends a paid order here, and the confirmation opens as
  // a popup over the dashboard. The gateway only hands back an order number, so the lines and
  // totals behind the popup are read from the order list this page already loads — which also
  // means the popup simply waits, showing nothing, until that list arrives.
  const paymentStatus = searchParams.get("status"); // success, for a settled gateway payment
  const paidOrderNumber = searchParams.get("order"); // order that payment belongs to
  // The order just paid for, when coming back from the gateway
  const paidOrder =
    paymentStatus === "success" && paidOrderNumber
      ? orders.find((order) => order.id === paidOrderNumber)
      : null;
  // Data for the "order confirmed" popup
  const confirmedOrder = paidOrder ? buildConfirmedOrder(paidOrder) : null;

  // Closing the popup drops just the gateway's own parameters, so it doesn't come back on a
  // refresh and any ?tab= the customer navigates to from here still works.
  const dismissConfirmation = () => {
    // Remove the gateway's status/order parameters from the URL
    const remaining = new URLSearchParams(searchParams);
    remaining.delete("status");
    remaining.delete("order");
    setSearchParams(remaining, { replace: true });
  };

  // stat card totals derived from orders
  const stats = {
    totalOrders: orders.length,
    inTransit: orders.filter((o) =>
      ["Assigned", "Picked Up", "Out for Delivery"].includes(o.status),
    ).length,
    delivered: orders.filter((o) => o.status === "Delivered").length,
    totalSpent: orders
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => sum + o.total, 0),
  };

  // jump to returns tab with an order preselected
  const handleReturnOrder = (orderId, type = "Return") => {
    setReturnPresetOrderId(orderId);
    setReturnPresetType(type);
    setActiveTab("returns");
  };

  const ActiveComponent = TABS[activeTab]; // panel component for current tab

  // per-tab props, only the active tab's entry is used
  const tabProps = {
    overview: { orders, onViewAllOrders: () => setActiveTab("orders") },
    orders: {
      orders,
      isLoading: ordersLoading,
      onReturnOrder: handleReturnOrder,
    },
    returns: {
      orders,
      presetOrderId: returnPresetOrderId,
      presetType: returnPresetType,
      onConsumePreset: () => {
        setReturnPresetOrderId(null);
        setReturnPresetType("Return");
      },
    },
    wallet: { onShopNow: () => navigate("/all-product") },
    complaints: { orders },
    policy: {},
    profile: { user },
    password: { user },
  }[activeTab];

  return (
    // full page bg
    <div className="min-h-screen bg-[#f4f6fa] text-slate-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* left dashboard sidebar */}
        <DashboardSidebar
          activeTab={activeTab}
          onChange={setActiveTab}
          isOpen={isOpen}
        />

        <main className={`min-w-0 flex-1 ${isOpen ? "lg:pl-64" : ""}`}>
          <div className="space-y-6 p-4 sm:p-6 lg:p-8">
            {/* sidebar show/hide + home link */}
            <PanelTopBar isOpen={isOpen} onToggle={toggle} />

            {/* welcome header - only on overview */}
            {activeTab === "overview" && (
              <DashboardHeader user={user} stats={stats} />
            )}
            {/* stat summary cards - only on overview */}
            {activeTab === "overview" && <DashboardStats stats={stats} />}
            {/* active tab panel */}
            <ActiveComponent {...tabProps} />
          </div>
        </main>
      </div>

      {/* order confirmed popup for a payment just settled at the gateway. No countdown is passed:
          the customer has arrived at their dashboard and stays there until they dismiss it. */}
      <OrderConfirmedModal
        order={confirmedOrder}
        onTrack={() =>
          navigate(
            `/track-order?order=${encodeURIComponent(confirmedOrder?.orderNumber ?? "")}`,
          )
        }
        onContinue={() => navigate("/")}
        onClose={dismissConfirmation}
      />
    </div>
  );
};

export default CustomerDashboard;
