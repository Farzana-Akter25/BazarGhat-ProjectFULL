import { ArrowLeft } from "lucide-react";
import AdminSidebar from "../components/admin/AdminSidebar"; // shared admin nav sidebar
import PanelTopBar from "../components/shared/PanelTopBar"; // sidebar toggle + home link
import usePanelSidebar from "../hooks/usePanelSidebar"; // remembers the sidebar choice

// Page frame for admin pages: sidebar, top bar, title and content
const AdminLayout = ({ title, subtitle, actions, backTo, children }) => { // title/subtitle: page heading, actions: header buttons, backTo: optional back link, children: page body
  const { isOpen, toggle } = usePanelSidebar("admin-sidebar"); // sidebar visibility

  return (
    // full page bg
    <div className="min-h-screen bg-[#f4f6fa] text-slate-900">
      <div className="flex min-h-screen">
        {/* left sidebar */}
        <AdminSidebar isOpen={isOpen} />

        {/* main content area */}
        <main className={`min-w-0 flex-1 ${isOpen ? "lg:pl-64" : ""}`}>
          <div className="p-4 sm:p-6 lg:p-8">
            {/* sidebar show/hide + home link */}
            <PanelTopBar isOpen={isOpen} onToggle={toggle} className="mb-4" />

            {/* back link */}
            {backTo && (
              <a
                href={backTo.to}
                onClick={(e) => {
                  e.preventDefault(); // stop normal navigation
                  backTo.onClick(); // custom back handler
                }}
                className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800"
              >
                <ArrowLeft size={14} /> {backTo.label || "Back to Dashboard"}
              </a>
            )}

            {/* page title + actions */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                {/* page heading */}
                <h1 className="text-2xl font-black tracking-tight text-slate-900 lg:text-[28px]">
                  {title}
                </h1>
                {/* page subtitle, optional */}
                {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
              </div>
              {/* header action buttons, optional */}
              {actions && (
                <div className="flex flex-wrap items-center gap-2">{actions}</div>
              )}
            </div>

            {/* page body */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
