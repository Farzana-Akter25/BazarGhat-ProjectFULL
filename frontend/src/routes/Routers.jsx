import { Navigate, Route, Routes } from "react-router-dom"; // router primitives
import CartCheckoutGuard from "./CartCheckoutGuard"; // guards /cart and /checkout
import RoleProtected from "./RoleProtected"; // guards role-only routes

// Layout
import AppLayout from "../layouts/AppLayout"; // site header + outlet wrapper
import MainLayout from "../layouts/MainLayout"; // main content + footer wrapper

// Pages
import Addresses from "../pages/customer/Addresses"; // saved addresses page

import ForgotPassword from "../pages/auth/ForgotPassword/ForgotPassword"; // forgot password page
import HomePage from "../pages/HomePage/HomePage"; // landing page
import Login from "../pages/auth/Login/Login"; // login page
import NotFound from "../pages/NotFound"; // unknown / not-yet-built route page
import Myprofile from "../pages/customer/Myprofile"; // profile page
import Register from "../pages/auth/Registration/Registration"; // sign up page
import ResetPassword from "../pages/auth/ResetPassword/ResetPassword"; // reset password page
import SearchPage from "../pages/customer/SearchPage"; // search results page

// ADMIN
import AdminDashboard from "../pages/admin/AdminDashboard"; // admin overview page
import ComplaintManagement from "../pages/admin/ComplaintManagement"; // admin complaints page
import CouponManagement from "../pages/admin/CouponManagement"; // admin coupons page
import CustomerManagement from "../pages/admin/CustomerManagement"; // admin customers page
import DeliveryAssignment from "../pages/admin/DeliveryAssignment"; // admin delivery assignment page
import DeliveryManagement from "../pages/admin/DeliveryManagement"; // admin delivery management page
import DeliveryRequests from "../pages/admin/DeliveryRequests"; // admin delivery requests page
import FlashSaleManagement from "../pages/admin/FlashSaleManagement"; // admin flash sales page
import InventoryManagement from "../pages/admin/InventoryManagement"; // admin inventory page
import InvoiceManagement from "../pages/admin/InvoiceManagement"; // admin invoices page
import OrderManagement from "../pages/admin/OrderManagement"; // admin orders page
import ProductManagement from "../pages/admin/ProductManagement"; // admin products page
import ReturnRefundManagement from "../pages/admin/ReturnRefundManagement"; // admin returns/refunds page
import AdminChangePassword from "../pages/admin/AdminChangePassword"; // admin change password page

import CustomerDashboard from "../pages/customer/CustomerDashboard/CustomerDashboard"; // customer dashboard page

import CartPage from "../pages/customer/Cart/CartPage"; // shopping cart page
import Checkout from "../pages/customer/Checkout"; // checkout page
import NotificationsPage from "../pages/shared/NotificationsPage"; // full notification history, all roles
import OrderPage from "../pages/customer/OrderPage"; // order history page
import TrackOrder from "../pages/customer/TrackOrder"; // track order page

import DeliveryDashboard from "../pages/delivery/DeliveryDashboard/DeliveryDashboard"; // delivery partner dashboard page
import Offer from "../pages/customer/Offer"; // flash sale / offers page
import ProductDetails from "../pages/customer/ProductDetails"; // single product page
import AllProduct from "../pages/customer/ProductPage/AllProduct"; // all products page
import Grocery from "../pages/customer/ProductPage/Grocery"; // grocery category page
import Organic from "../pages/customer/ProductPage/Organic"; // organic category page

// All the app's pages and which layout and guard each one uses
const Routers = () => {
  return (
    <Routes>
      {/* GLOBAL HEADER — shown on every page except /login and /register */}
      <Route element={<AppLayout />}> {/* header wrapper */}
      {/* MAIN LAYOUT */}
      <Route element={<MainLayout />}> {/* footer wrapper */}
        <Route path="/" element={<HomePage />} /> {/* home route */}
        <Route path="/homepage" element={<HomePage />} /> {/* alt home route */}

        {/* USER */}
        <Route
          path="/cart" // cart route
          element={
            <CartCheckoutGuard>
              <CartPage /> {/* cart page content */}
            </CartCheckoutGuard>
          }
        />
        <Route
          path="/checkout" // checkout route
          element={
            <CartCheckoutGuard requireAuth>
              <Checkout /> {/* checkout page content, login required */}
            </CartCheckoutGuard>
          }
        />


        {/* orders & account */}
        <Route path="/orderpage" element={<OrderPage />} /> {/* order history route */}
        <Route path="/track-order" element={<TrackOrder />} /> {/* track order route */}
        <Route path="/addresses" element={<Addresses />} /> {/* saved addresses route */}
        <Route path="/myprofile" element={<Myprofile />} /> {/* profile route */}

        {/* PRODUCTS */}
        <Route path="/organic" element={<Organic />} /> {/* organic category route */}
        <Route path="/grocery" element={<Grocery />} /> {/* grocery category route */}
        <Route path="/all-product" element={<AllProduct />} /> {/* all products route */}
        <Route path="/product/:id" element={<ProductDetails />} /> {/* product details route */}
        <Route path="/offer" element={<Offer />} /> {/* flash sale route */}

        {/* search page */}
        <Route path="/search" element={<SearchPage />} /> {/* search results route */}

      
        <Route
          path="/notifications" // full notification history route
          element={
            <RoleProtected requiredRoles={["customer", "delivery", "admin"]} fallback="/login">
              <NotificationsPage /> {/* notification history content */}
            </RoleProtected>
          }
        />

        {/* 404 / not-yet-built pages — inside MainLayout so the header and footer stay visible */}
        <Route path="*" element={<NotFound />} />

      </Route>

      {/* AUTH */}
      <Route path="/login" element={<Login />} /> {/* login route, no header */}
      <Route path="/register" element={<Register />} /> {/* sign up route, no header */}
      <Route path="/forgot-password" element={<ForgotPassword />} /> {/* forgot password route */}
      <Route path="/reset-password" element={<ResetPassword />} /> {/* reset password route */}

      {/* CUSTOMER DASHBOARD (own sidebar layout, site header shown above it) — customer-only, gated by RoleProtected */}
      <Route
        path="/customer-dashboard" // customer dashboard route
        element={
          <RoleProtected requiredRoles={["customer"]} fallback="/login">
            <CustomerDashboard /> {/* customer dashboard content */}
          </RoleProtected>
        }
      />

      {/* DELIVERY DASHBOARD (own sidebar layout, site header shown above it) — delivery-only, gated by RoleProtected */}
      <Route
        path="/deliverydashboard" // delivery dashboard route
        element={
          <RoleProtected requiredRoles={["delivery"]} fallback="/login">
            <DeliveryDashboard /> {/* delivery dashboard content */}
          </RoleProtected>
        }
      />

      {/* ADMIN (own sidebar layout, site header shown above it) — admin-only, gated by RoleProtected */}
      <Route
        path="/admindashboard" // admin dashboard route
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <AdminDashboard /> {/* admin dashboard content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/orders" // admin orders route
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <OrderManagement /> {/* admin orders content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/products" // admin products route
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <ProductManagement /> {/* admin products content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/inventory" // admin inventory route
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <InventoryManagement /> {/* admin inventory content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/flash-sales" // admin flash sales route
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <FlashSaleManagement /> {/* admin flash sales content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/coupons" // admin coupons route
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <CouponManagement /> {/* admin coupons content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/customers" // admin customers route
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <CustomerManagement /> {/* admin customers content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/delivery" // admin delivery management route
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <DeliveryManagement /> {/* admin delivery content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/delivery-assignment" // admin delivery assignment route
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <DeliveryAssignment /> {/* admin delivery assignment content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/delivery-requests" // admin delivery requests route
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <DeliveryRequests /> {/* admin delivery requests content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/invoices" // admin invoices route
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <InvoiceManagement /> {/* admin invoices content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/returns-refunds" // admin returns/refunds route
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <ReturnRefundManagement /> {/* admin returns/refunds content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/complaints" // old single-page link, now opens the customer list
        element={<Navigate to="/admin/complaints/customer" replace />}
      />
      <Route
        path="/admin/complaints/customer" // complaints filed by customers
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <ComplaintManagement kind="customer" /> {/* customer complaints content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/complaints/delivery-man" // complaints filed by delivery men
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <ComplaintManagement kind="dm" /> {/* delivery man complaints content */}
          </RoleProtected>
        }
      />
      <Route
        path="/admin/reset-password" // admin change password route
        element={
          <RoleProtected requiredRoles={["admin"]} fallback="/login">
            <AdminChangePassword /> {/* admin change password content */}
          </RoleProtected>
        }
      />

      </Route>
    </Routes>
  );
};

export default Routers;
