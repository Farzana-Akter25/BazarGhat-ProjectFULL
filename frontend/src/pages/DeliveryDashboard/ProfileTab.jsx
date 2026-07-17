import { Camera, Mail, MapPin, Phone, Truck, User } from "lucide-react";
import { useState } from "react";
import { rider } from "./data";

const initials = (name) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const FIELDS = [
  { key: "name", label: "Full Name", icon: User },
  { key: "phone", label: "Phone", icon: Phone },
  { key: "email", label: "Email", icon: Mail },
  { key: "area", label: "Delivery Area", icon: MapPin },
];

const ProfileTab = () => {
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [form, setForm] = useState({
    name: rider.name,
    phone: rider.phone,
    email: rider.email,
    area: rider.area,
  });

  const handleChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-slate-800">My Profile</h1>
        <p className="text-sm text-slate-400">
          Update your personal information
        </p>
      </div>

      <div className="max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-emerald-800 to-emerald-500" />

        <div className="px-6 pb-6">
          <div className="relative -mt-10 mb-5 h-20 w-20">
            {photo ? (
              <img
                src={photo}
                alt="Profile"
                className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow-sm"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-orange-400 to-emerald-500 text-lg font-bold text-white shadow-sm">
                {initials(rider.name)}
              </div>
            )}
            <label className="absolute -right-1 -bottom-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-slate-800 text-white shadow-sm transition-colors hover:bg-slate-700">
              <Camera size={13} />
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handlePhotoUpload}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key}>
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                  <field.icon size={12} /> {field.label}
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={form[field.key]}
                    onChange={handleChange(field.key)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                ) : (
                  <div className="rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700">
                    {form[field.key]}
                  </div>
                )}
              </div>
            ))}

            <div className="sm:col-span-2">
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                <Truck size={12} /> Vehicle
              </label>
              <div className="rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700">
                {rider.vehicle} · {rider.vehicleNumber}
              </div>
            </div>
          </div>

          <button
            onClick={() => setEditing((v) => !v)}
            className="mt-5 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800"
          >
            {editing ? "Save Changes" : "Edit Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
