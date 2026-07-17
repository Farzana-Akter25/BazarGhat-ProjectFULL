import AdminLayout from "../../layouts/AdminLayout";

const AdminComingSoon = ({ title, subtitle, icon: Icon, bg = "bg-emerald-500" }) => {
  return (
    <AdminLayout title={title} subtitle={subtitle}>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-24 text-center shadow-sm">
        <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${bg}`}>
          {Icon && <Icon size={28} className="text-white" />}
        </div>
        <h2 className="text-xl font-black text-slate-800">{title}</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-400">
          This module is coming soon. It will let you manage {title.toLowerCase()} from this dashboard.
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminComingSoon;
