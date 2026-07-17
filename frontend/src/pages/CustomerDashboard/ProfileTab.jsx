import { Camera, CheckCircle2, DollarSign, Mail, MapPin, Phone, Save, TrendingUp, User } from "lucide-react";
import { useState } from "react";
import { customer, STATS } from "./data";

const initials = customer.name
  .split(" ")
  .map((n) => n[0])
  .join("")
  .toUpperCase();

const FIELDS = [
  { key: "name", label: "Full Name", icon: User, type: "input" },
  { key: "email", label: "Email Address", icon: Mail, type: "input" },
  { key: "phone", label: "Phone Number", icon: Phone, type: "input" },
  { key: "address", label: "Delivery Address", icon: MapPin, type: "textarea" },
];

const ProfileTab = () => {
  const [form, setForm] = useState({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
  });
  const [photo, setPhoto] = useState(null);

  const handleChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e.preventDefault();
    alert("Profile saved!");
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0">
            {photo ? (
              <img
                src={photo}
                alt="Profile"
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white">
                {initials}
              </div>
            )}
            <label className="absolute -right-1 -bottom-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-slate-800 text-white shadow-sm transition-colors hover:bg-slate-700">
              <Camera size={12} />
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhotoUpload}
              />
            </label>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              {customer.name}
            </h3>
            <p className="text-xs font-medium text-slate-400">
              Customer ID: {customer.customerId}
            </p>
          </div>
        </div>

        <div className="my-5 border-t border-slate-100" />

        <div className="space-y-4">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <field.icon size={13} className="text-slate-400" /> {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  value={form[field.key]}
                  onChange={handleChange(field.key)}
                  className="min-h-[90px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              ) : (
                <input
                  type="text"
                  value={form[field.key]}
                  onChange={handleChange(field.key)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              )}
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <Save size={16} /> Save Changes
        </button>
      </form>

      <div>
        <h3 className="mb-3 text-base font-bold text-slate-800">
          Account Statistics
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <DollarSign size={18} strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {STATS.totalSpent}TK
              </p>
              <p className="text-xs font-medium text-slate-400">Total Spent</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {STATS.delivered}
              </p>
              <p className="text-xs font-medium text-slate-400">
                Completed Orders
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp size={18} strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">
                {STATS.inTransit}
              </p>
              <p className="text-xs font-medium text-slate-400">
                Active Orders
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
