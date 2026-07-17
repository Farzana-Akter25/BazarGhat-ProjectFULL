import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/HomePage/Header"; 
import Footer from "../components/HomePage/Footer";

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - Global navigation */}
      <Header />

      {/* Page Content - Dynamically rendered via Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer - Global footer */}
      <Footer />
    </div>
  );
};

export default MainLayout;