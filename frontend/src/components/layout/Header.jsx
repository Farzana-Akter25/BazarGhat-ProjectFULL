import { Home, LogOut, MapPin, Search, ShoppingCart, User } from "lucide-react";
import { useCallback, useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import { CartContext } from "../../context/CartContext";
import { SearchContext } from "../../context/SearchContext";
import { useGetProductsQuery } from "../../features/product/productApi";
import useAuth from "../../hooks/useAuth";
import { logoutSuccess, useLogoutMutation } from "../../features/auth/authSlice";
import { apiSlice } from "../../features/api/apiSlice";
import NotificationBell from "../shared/NotificationBell";
import AuthModal from "../auth/AuthModal"; // sign in / sign up popup
import TrackOrderModal from "../customer/TrackOrderModal"; // order tracking popup
import {
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "../../features/customer/notificationApi";
import {
  useDeleteDeliveryNotificationMutation,
  useGetDeliveryNotificationsQuery,
  useMarkAllDeliveryNotificationsReadMutation,
  useMarkDeliveryNotificationReadMutation,
} from "../../features/delivery/notificationApi";
import {
  useDeleteAdminNotificationMutation,
  useGetAdminNotificationsQuery,
  useMarkAllAdminNotificationsReadMutation,
  useMarkAdminNotificationReadMutation,
} from "../../features/admin/notificationApi";
import notificationTarget from "../../utils/notificationTarget";
import { matchesSearch } from "../../utils/productSearch"; // name/category/description/price matching

// Site header: logo, search, cart, notifications and account menu
const Header = () => {
  // Cart, search, login state, Redux and router helpers
  const { cartItems } = useContext(CartContext);
  const { search, setSearch } = useContext(SearchContext);
  const { isAuthenticated, user } = useAuth();
  const dispatch = useDispatch();
  const [logout] = useLogoutMutation();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false); // search results dropdown visibility
  const [authModal, setAuthModal] = useState(null); // null | "login" | "register", which auth popup is open
  const [trackModal, setTrackModal] = useState(false); // order tracking popup visibility

  // stable so the popup effect and the login redirect do not re-run each render
  const closeAuthModal = useCallback(() => setAuthModal(null), []);
  // Close the track-order popup
  const closeTrackModal = useCallback(() => setTrackModal(false), []);

  // role flags, drive which nav items/notifications show
  const isCustomer = isAuthenticated && user?.role === "customer";
  // Is the user a delivery man or an admin?
  const isDelivery = isAuthenticated && user?.role === "delivery";
  const isAdmin = isAuthenticated && user?.role === "admin";

  // customer notifications, polled while logged in as customer
  const { data: customerNotificationData } = useGetNotificationsQuery(undefined, {
    skip: !isCustomer,
    pollingInterval: 5000,
  });
  // Customer notification actions
  const [markCustomerNotificationRead] = useMarkNotificationReadMutation();
  const [markAllCustomerNotificationsRead] = useMarkAllNotificationsReadMutation();

  // delivery notifications, polled while logged in as delivery
  const { data: deliveryNotificationData } = useGetDeliveryNotificationsQuery(undefined, {
    skip: !isDelivery,
    pollingInterval: 5000,
  });
  // Delivery notification actions
  const [markDeliveryNotificationRead] = useMarkDeliveryNotificationReadMutation();
  const [markAllDeliveryNotificationsRead] = useMarkAllDeliveryNotificationsReadMutation();
  const [deleteCustomerNotification] = useDeleteNotificationMutation();
  const [deleteDeliveryNotification] = useDeleteDeliveryNotificationMutation();

  // admin notifications, polled while logged in as admin
  const { data: adminNotificationData } = useGetAdminNotificationsQuery(undefined, {
    skip: !isAdmin,
    pollingInterval: 5000,
  });
  // Admin notification actions
  const [markAdminNotificationRead] = useMarkAdminNotificationReadMutation();
  const [markAllAdminNotificationsRead] = useMarkAllAdminNotificationsReadMutation();
  const [deleteAdminNotification] = useDeleteAdminNotificationMutation();

  // pick the active role's notification data/handlers
  const notificationRole = isAdmin ? "admin" : isDelivery ? "delivery" : "customer";
  // Pick the value that matches the logged-in role
  const byRole = (admin, delivery, customer) =>
    ({ admin, delivery, customer })[notificationRole];

  // Notification list and actions for the current role
  const notificationData = byRole(
    adminNotificationData,
    deliveryNotificationData,
    customerNotificationData,
  );
  const markNotificationRead = byRole(
    markAdminNotificationRead,
    markDeliveryNotificationRead,
    markCustomerNotificationRead,
  );
  const markAllNotificationsRead = byRole(
    markAllAdminNotificationsRead,
    markAllDeliveryNotificationsRead,
    markAllCustomerNotificationsRead,
  );
  const deleteNotification = byRole(
    deleteAdminNotification,
    deleteDeliveryNotification,
    deleteCustomerNotification,
  );

  // Clicking a notification marks it read and, when it points at a page this role can open, goes there.
  const openNotification = (notification) => {
    if (!notification.read) {
      markNotificationRead(notification.id);
    }

    // Page this notification should open
    const target = notificationTarget(notification, notificationRole);

    if (target) {
      navigate(target);
    }
  };

  // clear session and redirect to login
  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      // ignore — clear local session regardless
    }
    dispatch(logoutSuccess());
    dispatch(apiSlice.util.resetApiState());
    navigate("/login");
  };

  // run search and go to results page
  const handleSearchExecution = (selectedText = search) => {
    if (selectedText.trim() !== "") {
      setSearch(selectedText);
      navigate("/search", { state: { query: selectedText } });
      setShowDropdown(false);
    }
  };

  // enter key triggers search
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearchExecution();
  };

  const { data: allProductsList = [] } = useGetProductsQuery({ per_page: 100 }); // full list for local search filter

  const query = search?.toLowerCase().trim() || ""; // normalized search text

  // products matching name/category/description or price
  const filteredProducts = query
    ? allProductsList?.filter((product) => matchesSearch(product, query))
    : [];

  return (
    // sticky top header bar
    <div className="sticky top-0 z-50 bg-white shadow-sm">
      <header className="bg-white py-4 px-6 md:px-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          {/* orange cart icon badge */}
          <div className="bg-orange-500 p-2 rounded-lg">
            <ShoppingCart className="text-white w-6 h-6" />
          </div>
          {/* brand name */}
          <h1 className="text-2xl font-extrabold text-orange-600">
            Bazar<span className="text-green-700">Ghat</span>
          </h1>
        </Link>

        {/* Search */}
        <div className="hidden md:flex flex-1 mx-10 relative">
          {/* search text input */}
          <input
            type="text"
            placeholder="Search in..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            className="w-full bg-gray-100 py-2.5 px-5 rounded-full outline-none focus:ring-2 focus:ring-orange-300"
          />

          {/* search icon, click to execute */}
          <Search
            className="absolute right-4 top-3 text-gray-400 w-5 h-5 cursor-pointer hover:text-orange-500"
            onClick={() => handleSearchExecution()}
          />

          {/* search results dropdown */}
          {showDropdown && query && (
            <div className="absolute top-12 left-0 w-full bg-white shadow-lg rounded-lg z-50 max-h-72 overflow-y-auto border">
              {filteredProducts.length > 0 ? (
                // matching product rows, capped to 8
                filteredProducts.slice(0, 8).map((product) => (
                  <div
                    key={product.id}
                    className="p-3.5 hover:bg-orange-50 cursor-pointer border-b last:border-0"
                    onClick={() => handleSearchExecution(product.name)}
                  >
                    <p className="text-sm font-semibold">{product.name}</p>
                  </div>
                ))
              ) : (
                // no matches message
                <div className="p-3 text-gray-500 text-sm text-center">
                  No product found
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDE ICONS (UPDATED SECTION) */}
        <div className="flex items-center gap-6">
          {/* Home */}
          <Link to="/" className="flex flex-col items-center group">
            <Home className="w-5 h-5 group-hover:text-orange-500 transition" />
            <span className="text-[11px]">Home</span>
          </Link>

          {/* Track Order — opens the popup over the current page */}
          <button
            type="button"
            onClick={() => setTrackModal(true)}
            className="flex flex-col items-center group"
          >
            <MapPin className="w-5 h-5 group-hover:text-orange-500 transition" />
            <span className="text-[11px]">Track</span>
          </button>

          {/* Account, routes by role */}
          <Link
            to={
              user?.role === "admin"
                ? "/admindashboard"
                : user?.role === "delivery"
                  ? "/deliverydashboard"
                  : "/customer-dashboard"
            }
            className="flex flex-col items-center group"
          >
            <User className="w-5 h-5 group-hover:text-orange-500 transition" />
            <span className="text-[11px]">Account</span>
          </Link>

          {isAuthenticated ? (
            // Logout
            <button
              type="button"
              onClick={handleLogout}
              className="flex flex-col items-center group"
            >
              <LogOut className="w-5 h-5 group-hover:text-orange-500 transition" />
              <span className="text-[11px]">Logout</span>
            </button>
          ) : (
            <>
              {/* Sign In — opens the popup over the current page */}
              <button
                type="button"
                onClick={() => setAuthModal("login")}
                className="flex flex-col items-center group"
              >
                <User className="w-5 h-5 group-hover:text-orange-500 transition" />
                <span className="text-[11px]">Sign In</span>
              </button>

              {/* Sign Up — opens the popup over the current page */}
              <button
                type="button"
                onClick={() => setAuthModal("register")}
                className="flex flex-col items-center group"
              >
                <User className="w-5 h-5 group-hover:text-orange-500 transition" />
                <span className="text-[11px]">Sign Up</span>
              </button>
            </>
          )}

          {/* Cart */}
          <Link to="/cart">
            <div className="flex flex-col items-center relative group">
              <ShoppingCart className="w-5 h-5 group-hover:text-orange-500" />
              {/* cart item count badge, hidden for admin */}
              {cartItems.length > 0 && !isAdmin && (
                <span className="absolute -top-1 -right-2 bg-orange-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItems.length}
                </span>
              )}
              <span className="text-[11px]">Cart</span>
            </div>
          </Link>

          {/* notification bell, all signed-in roles */}
          {(isCustomer || isDelivery || isAdmin) && (
            <NotificationBell
              notifications={notificationData?.notifications}
              unreadCount={notificationData?.unreadCount}
              onMarkRead={markNotificationRead}
              onMarkAllRead={markAllNotificationsRead}
              onDelete={deleteNotification}
              onOpenNotification={openNotification}
            />
          )}
        </div>
      </header>

      {/* sign in / sign up popup, rendered over the current page */}
      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={closeAuthModal}
          onModeChange={setAuthModal}
        />
      )}

      {/* order tracking popup, rendered over the current page */}
      {trackModal && <TrackOrderModal onClose={closeTrackModal} />}
    </div>
  );
};

export default Header;
