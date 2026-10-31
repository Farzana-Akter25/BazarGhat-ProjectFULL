import { AlertCircle, Mail, MapPin, Phone, Save, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { updateUser } from "../../../features/auth/authSlice";
import { useUpdateProfileMutation } from "../../../features/customer/profileApi";

// Profile form fields.
const FIELDS = [
  { key: "name", label: "Full Name", icon: User, type: "input" },
  { key: "email", label: "Email Address", icon: Mail, type: "input" },
  { key: "phone", label: "Phone Number", icon: Phone, type: "input" },
  {
    key: "address",
    label: "Delivery Address",
    icon: MapPin,
    type: "textarea",
    full: true,
  },
];

// shared field styles, so every input on the form is the same size
const LABEL =
  "mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600";
// Style shared by the form inputs
const INPUT =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

// avatar initials from name
const initials = (name) =>
  (name || "C")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

// Profile tab: edit name, email, phone and address
const ProfileTab = ({ user }) => {
  // Redux dispatch, to update the saved user
  const dispatch = useDispatch();
  // editable form state, seeded from logged-in user
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });
  const [banner, setBanner] = useState(null); // save success/error banner

  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();

  // re-sync form when user data changes elsewhere
  useEffect(() => {
    setForm({
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
    });
  }, [user?.name, user?.email, user?.phone, user?.address]);

  // generic field change handler, keyed by field name
  const handleChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // save profile changes to backend
  const handleSave = async (e) => {
    e.preventDefault();
    setBanner(null);
    try {
      // Save the profile and update the stored user
      const res = await updateProfile(form).unwrap();
      dispatch(updateUser(res.user));
      setBanner({ type: "success", message: "Profile saved successfully!" });
    } catch (err) {
      setBanner({
        type: "error",
        message:
          err?.data?.message || "Failed to save profile. Please try again.",
      });
    }
  };

  return (
    // A form of four fields reads badly stretched across a desktop panel, so it sits in one narrow column, the same width as the other account tabs.
    <div className="mx-auto w-full max-w-2xl">
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        {/* avatar + name header */}
        <div className="flex items-center gap-3">
          {/* initials avatar circle */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
            {initials(user?.name)}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-800">
              {user?.name}
            </h3>
            {/* zero-padded customer id */}
            <p className="text-[11px] font-medium text-slate-600">
              Customer ID: CUST{String(user?.id ?? 0).padStart(4, "0")}
            </p>
          </div>
        </div>

        <div className="my-4 border-t border-slate-100" />

        {/* save result banner */}
        {banner && (
          <div
            className={`mb-3 flex items-center gap-2 rounded-lg p-2.5 text-xs font-semibold ${
              banner.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            <AlertCircle size={14} className="shrink-0" />
            {banner.message}
          </div>
        )}

        {/* editable profile fields — two to a row, address across both */}
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className={field.full ? "sm:col-span-2" : ""}>
              {/* field label + icon */}
              <label className={LABEL}>
                <field.icon size={12} className="text-slate-600" />
                {field.label}
              </label>
              {field.type === "textarea" ? (
                // multi-line field (address)
                <textarea
                  rows={2}
                  value={form[field.key]}
                  onChange={handleChange(field.key)}
                  className={`${INPUT} resize-y`}
                />
              ) : (
                // single-line field
                <input
                  type="text"
                  value={form[field.key]}
                  onChange={handleChange(field.key)}
                  className={INPUT}
                />
              )}
            </div>
          ))}
        </div>

        {/* save button — sized to its label rather than the whole card */}
        <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={15} /> {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileTab;
