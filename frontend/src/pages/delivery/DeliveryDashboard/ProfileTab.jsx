import { Mail, MapPin, Phone, Truck, User } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useGetDeliveryDashboardQuery,
  useUpdateDeliveryProfileMutation,
} from "../../../features/delivery/deliveryApi";

// build initials from a full name
const initials = (name) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

// profile field definitions
const FIELDS = [
  { key: "name", label: "Full Name", icon: User },
  { key: "phone", label: "Phone", icon: Phone },
  { key: "email", label: "Email", icon: Mail },
  { key: "area", label: "Delivery Area", icon: MapPin },
];

// shared field styles, so every row on the card is the same size whether it is being edited or just read
const LABEL =
  "mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-slate-600 uppercase";
// Styles for editable inputs and read-only values
const INPUT =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors focus:border-green-700 focus:ring-2 focus:ring-green-100";
const READONLY =
  "rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700";

// Delivery man profile tab: view and edit account and vehicle details
const ProfileTab = () => {
  // Current details and the save call
  const { data } = useGetDeliveryDashboardQuery();
  const [updateProfile, { isLoading }] = useUpdateDeliveryProfileMutation();

  const [editing, setEditing] = useState(false); // edit mode toggle
  const [form, setForm] = useState(null); // editable form state

  // seed form once rider data loads
  useEffect(() => {
    if (data?.rider && !form) {
      setForm({
        name: data.rider.name,
        phone: data.rider.phone ?? "",
        email: data.rider.email,
        area: data.rider.area ?? "",
        vehicle: data.rider.vehicle ?? "",
        vehicleNumber: data.rider.vehicleNumber ?? "",
      });
    }
  }, [data, form]);

  if (!form) {
    // loading state
    return <p className="text-sm text-slate-600">Loading profile...</p>;
  }

  // generic field change handler
  const handleChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // toggle edit mode, saving on exit
  const handleToggle = async () => {
    if (editing) {
      await updateProfile({
        name: form.name,
        email: form.email,
        phone: form.phone,
        area: form.area,
        vehicle_type: form.vehicle,
        vehicle_number: form.vehicleNumber,
      });
    }
    setEditing((v) => !v);
  };

  return (
    // Six short fields don't need the width of the whole panel, so the card sits in one narrow column — same width as the Reset Password tab.
    <div className="mx-auto w-full max-w-2xl space-y-4">
      {/* page header */}
      <div>
        {/* page title */}
        <h1 className="text-lg font-bold text-slate-800">My Profile</h1>
        {/* page subtitle */}
        <p className="text-sm text-slate-600">
          Update your personal information
        </p>
      </div>

      {/* profile card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* avatar + name header, in the card rather than over a cover banner: the banner cost a block of height and said nothing */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-orange-400 to-green-700 text-sm font-bold text-white">
            {initials(form.name)}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-800">
              {form.name}
            </h3>
            <p className="truncate text-[11px] font-medium text-slate-600">
              {form.area || "No area set"} · {form.vehicle || "No vehicle"}
            </p>
          </div>
          {/* edit/save toggle sits with the identity it edits */}
          <button
            onClick={handleToggle}
            disabled={isLoading}
            className="ml-auto shrink-0 rounded-lg bg-green-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-60"
          >
            {editing
              ? isLoading
                ? "Saving..."
                : "Save Changes"
              : "Edit Profile"}
          </button>
        </div>

        <div className="my-4 border-t border-slate-100" />

        {/* editable profile fields — two to a row */}
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {FIELDS.map((field) => (
            // single field block
            <div key={field.key}>
              {/* field label with icon */}
              <label className={LABEL}>
                <field.icon size={12} /> {field.label}
              </label>
              {editing ? (
                // editable input
                <input
                  type="text"
                  value={form[field.key]}
                  onChange={handleChange(field.key)}
                  className={INPUT}
                />
              ) : (
                // read-only value
                <div className={READONLY}>{form[field.key]}</div>
              )}
            </div>
          ))}

          {/* vehicle info field */}
          <div className="sm:col-span-2">
            {/* vehicle field label */}
            <label className={LABEL}>
              <Truck size={12} /> Vehicle
            </label>
            {editing ? (
              // editable vehicle inputs
              <div className="grid grid-cols-2 gap-3">
                {/* vehicle type input */}
                <input
                  type="text"
                  value={form.vehicle}
                  onChange={handleChange("vehicle")}
                  placeholder="Vehicle type"
                  className={INPUT}
                />
                {/* vehicle number input */}
                <input
                  type="text"
                  value={form.vehicleNumber}
                  onChange={handleChange("vehicleNumber")}
                  placeholder="Vehicle number"
                  className={INPUT}
                />
              </div>
            ) : (
              // read-only vehicle summary
              <div className={READONLY}>
                {form.vehicle || "—"} · {form.vehicleNumber || "—"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
