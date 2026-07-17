import AdminSidebar from "../components/admin/AdminSidebar";

const AdminLayout = ({ title, subtitle, actions, backTo, children }) => {
  return (
    <div className="min-h-screen bg-[#f4f6fa] text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <main className="min-w-0 flex-1">
          <div className="p-4 sm:p-6 lg:p-8">
            {backTo && (
              <a
                href={backTo.to}
                onClick={(e) => {
                  e.preventDefault();
                  backTo.onClick();
                }}
                className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
              >
                ← {backTo.label || "Back to Dashboard"}
              </a>
            )}

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 lg:text-[28px]">
                  {title}
                </h1>
                {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
              </div>
              {actions && (
                <div className="flex flex-wrap items-center gap-2">{actions}</div>
              )}
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
