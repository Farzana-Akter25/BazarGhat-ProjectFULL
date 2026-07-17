import { Navigate, Route, Routes } from "react-router-dom";

// Context
import { UserProvider } from "../context/UserProfile";

// Layout
import MainLayout from "../layouts/MainLayout";

// Pages
import Addresses from "../pages/Addresses";

import HomePage from "../pages/HomePage/HomePage";
import Login from "../pages/Login/Login";
import Myprofile from "../pages/Myprofile";
import Register from "../pages/Registration/Registration";
import SearchPage from "../pages/SearchPage";

// ADMIN
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminResetPassword from "../pages/admin/AdminResetPassword";
import ComplaintManagement from "../pages/admin/ComplaintManagement";
import CustomerManagement from "../pages/admin/CustomerManagement";
import DeliveryAssignment from "../pages/admin/DeliveryAssignment";
import DeliveryManagement from "../pages/admin/DeliveryManagement";
import InventoryManagement from "../pages/admin/InventoryManagement";
import InvoiceManagement from "../pages/admin/InvoiceManagement";
import OrderManagement from "../pages/admin/OrderManagement";
import ProductManagement from "../pages/admin/ProductManagement";
import ReturnRefundManagement from "../pages/admin/ReturnRefundManagement";
import SalesAnalytics from "../pages/admin/SalesAnalytics";

import CustomerDashboard from "../pages/CustomerDashboard/CustomerDashboard";

import CartPage from "../pages/Cart/CartPage";
import Checkout from "../pages/Checkout";
import OrderPage from "../pages/OrderPage";

import Deliverydashboard from "../pages/DeliveryDashboard/DeliveryDashboard";
import Offer from "../pages/Offer";
import AllProduct from "../pages/ProductPage/Allproduct";
import Grocery from "../pages/ProductPage/Grocery";
import Organic from "../pages/ProductPage/Organic";

import Allpayment from "../pages/Allpayment";

const Routers = () => {
  return (
    <UserProvider>
      <Routes>
        {/* MAIN LAYOUT */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/homepage" element={<HomePage />} />

          {/* USER */}
          <Route path="/deliverydashboard" element={<Deliverydashboard />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
        
         
          <Route path="/orderpage" element={<OrderPage />} />
          <Route path="/addresses" element={<Addresses />} />
          <Route path="/myprofile" element={<Myprofile />} />

          {/* PRODUCTS */}
          <Route path="/organic" element={<Organic />} />
          <Route path="/grocery" element={<Grocery />} />
          <Route path="/all-product" element={<AllProduct />} />
          <Route path="/offer" element={<Offer />} />

          <Route path="/search" element={<SearchPage />} />

          {/* PAYMENT */}
          {/* NOTE: paymentmethod components (Bank/Bkash/Nagad) missing in this repo snapshot.
              Disabling these routes prevents <Routers> crash. */}
          <Route path="/allpayment" element={<Allpayment />} />
          {/* <Route path="/checkout/bkash" element={<Bkash />} /> */}
          {/* <Route path="/checkout/nagad" element={<Nagad />} /> */}
          {/* <Route path="/checkout/bank" element={<Bank />} /> */}

        </Route>

        {/* AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* CUSTOMER DASHBOARD (own layout — no site header/footer) */}
        <Route path="/customer-dashboard" element={<CustomerDashboard />} />

        {/* ADMIN (own layout — no customer header/footer) */}
        <Route path="/admindashboard" element={<AdminDashboard />} />
        <Route path="/admin/sales-analytics" element={<SalesAnalytics />} />
        <Route path="/admin/orders" element={<OrderManagement />} />
        <Route path="/admin/products" element={<ProductManagement />} />
        <Route path="/admin/inventory" element={<InventoryManagement />} />
        <Route path="/admin/customers" element={<CustomerManagement />} />
        <Route path="/admin/delivery" element={<DeliveryManagement />} />
        <Route path="/admin/delivery-assignment" element={<DeliveryAssignment />} />
        <Route path="/admin/invoices" element={<InvoiceManagement />} />
        <Route path="/admin/returns-refunds" element={<ReturnRefundManagement />} />
        <Route path="/admin/complaints" element={<ComplaintManagement />} />

        <Route path="/admin/settings" element={<AdminResetPassword />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserProvider>
  );
};

export default Routers;
