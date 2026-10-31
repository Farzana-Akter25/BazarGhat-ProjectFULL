import React from "react";
import { Outlet } from "react-router-dom"; // routed page content slot
import Footer from "../components/layout/Footer"; // global site footer

// Page frame with the page content and the footer
const MainLayout = () => {
  return (
    // full height flex column wrapper
    <div className="min-h-screen flex flex-col">
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
