import { Lock, RefreshCcw } from "lucide-react";
import { useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";

const FIELDS = [
  { key: "current", label: "Current Password", placeholder: "Enter current password" },
  { key: "next", label: "New Password", placeholder: "Enter new password" },
  { key: "confirm", label: "Confirm Password", placeholder: "Confirm new password" },
];

const AdminResetPassword = () => {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });

  const handleChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.next.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }
    if (form.next !== form.confirm) {
      alert("New password and confirm password do not match.");
      return;
    }
    alert("Password updated successfully!");
    setForm({ current: "", next: "", confirm: "" });
  };

  return (
    <AdminLayout title="Settings" subtitle="Reset your admin account password">
      <form
        onSubmit={handleSubmit}
        className="max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
      >
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs font-medium text-amber-700">
          <Lock size={15} className="shrink-0" />
          Choose a strong password with at least 6 characters.
        </div>

        <div className="space-y-4">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                {field.label}
              </label>
              <input
                type="password"
                required
                value={form[field.key]}
                onChange={handleChange(field.key)}
                placeholder={field.placeholder}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
        >
          <RefreshCcw size={16} /> Update Password
        </button>
      </form>
    </AdminLayout>
  );
};

export default AdminResetPassword;
