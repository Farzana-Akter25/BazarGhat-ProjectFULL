import {
  Ban,
  Bike,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Search as SearchIcon,
  ShieldOff,
  Star,
  UserCheck,
  X,
} from "lucide-react"; // icon set for stats, table and modal
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, StatusBadge } from "../../components/admin/AdminUI"; // shared card + status pill
import {
  useCreateDeliveryStaffMutation,
  useGetDeliveryStaffDetailQuery,
  useGetDeliveryStaffQuery,
  useToggleDeliveryStatusMutation,
} from "../../features/admin/deliveryApi";
import AdminLayout from "../../layouts/AdminLayout"; // shared admin page frame
import { toDeliveryStatus } from "../../utils/orderStatus";
import { formatDate } from "../../utils/formatDate";
import { TH } from "../../components/shared/DataTable"; // shared table header cell style

// status filter tabs
const FILTERS = ["All", "Active", "Inactive", "Blocked"];

// blank add-staff form state
const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  area: "",
  vehicle_type: "",
  vehicle_number: "",
  password: "",
  password_confirmation: "",
};

// Admin page listing delivery men, with add and block/unblock
const DeliveryManagement = () => {
  // Router helper
  const navigate = useNavigate();
  const { data: staff = [], isLoading } = useGetDeliveryStaffQuery(); // delivery personnel list
  const [toggleDeliveryStatus] = useToggleDeliveryStatusMutation(); // block/unblock mutation
  const [createDeliveryStaff, { isLoading: isCreating }] =
    useCreateDeliveryStaffMutation(); // add staff mutation
  const [query, setQuery] = useState(""); // search box text
  const [filter, setFilter] = useState("All"); // status filter pill
  const [showAddModal, setShowAddModal] = useState(false); // add staff modal visibility
  const [form, setForm] = useState(EMPTY_FORM); // add staff form values
  const [formError, setFormError] = useState(""); // add staff form error text
  const [showPassword, setShowPassword] = useState(false); // toggle password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // toggle confirm password visibility
  const [viewingProfileId, setViewingProfileId] = useState(null); // profileId of staff member shown in detail modal

  // stat card counts derived from staff list
  const counts = useMemo(
    () => ({
      total: staff.length,
      active: staff.filter((s) => s.status === "Active").length,
      blocked: staff.filter((s) => s.status === "Blocked").length,
    }),
    [staff],
  );

  // staff filtered by search + status pill
  const filtered = useMemo(
    () =>
      staff.filter((s) => {
        // Keep delivery men matching the search text and status filter
        const matchesQuery =
          !query ||
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.email.toLowerCase().includes(query.toLowerCase()) ||
          s.phone.includes(query) ||
          s.area.toLowerCase().includes(query.toLowerCase()) ||
          s.id.toLowerCase().includes(query.toLowerCase());
        const matchesFilter = filter === "All" || s.status === filter;
        return matchesQuery && matchesFilter;
      }),
    [staff, query, filter],
  );

  // flip a staff member between Active and Blocked
  const toggleBlock = (member) => {
    toggleDeliveryStatus({
      profileId: member.profileId,
      status: member.status === "Active" ? "Blocked" : "Active",
    });
  };


  // generic form field updater keyed by field name
  const handleFormChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // reset and close the add staff modal
  const closeModal = () => {
    setShowAddModal(false);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // submit new delivery staff form
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await createDeliveryStaff(form).unwrap();
      closeModal();
    } catch (err) {
      // Show the first validation error, or the server message
      const errors = err?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : null;
      setFormError(
        firstError || err?.data?.message || "Failed to add delivery man.",
      );
    }
  };

  return (
    <AdminLayout
      title="Delivery Personnel Management"
      subtitle="View, manage, and block/unblock delivery personnel"
      backTo={{
        to: "/admindashboard",
        onClick: () => navigate("/admindashboard"),
      }}
    >
      {/* summary stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* total delivery staff card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600">Total Delivery Staff</p>
              <p className="mt-1 text-2xl font-extrabold text-blue-600">
                {counts.total}
              </p>
            </div>
            {/* delivery man icon badge */}
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-500">
              <Bike size={18} />
            </div>
          </div>
        </div>
        {/* active personnel card */}
        <div className="rounded-2xl border border-green-200 bg-green-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600">Active Personnel</p>
              <p className="mt-1 text-2xl font-extrabold text-green-700">
                {counts.active}
              </p>
            </div>
            {/* check icon badge */}
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-green-700">
              <UserCheck size={18} />
            </div>
          </div>
        </div>
        {/* blocked personnel card */}
        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600">Blocked Personnel</p>
              <p className="mt-1 text-2xl font-extrabold text-red-500">
                {counts.blocked}
              </p>
            </div>
            {/* shield-off icon badge */}
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-500">
              <ShieldOff size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* add delivery man action, below the stat cards */}
      <div className="mt-6 flex justify-end">
        {/* open add staff modal button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-800"
        >
          <Plus size={16} />
          Add Delivery Man
        </button>
      </div>

      <Card className="mt-4">
        {/* search + status filter bar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* search box */}
          <div className="relative flex-1">
            {/* search icon inside input */}
            <SearchIcon
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)} // update search text
              type="text"
              placeholder="Search by name, email, phone, area, or ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-green-700 focus:bg-white"
            />
          </div>
          {/* status filter pills */}
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              // status filter pill button
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  filter === f
                    ? "bg-green-700 text-white shadow"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* personnel table */}
        <div className="rounded-xl border border-slate-200">
          <table className="w-full table-auto text-left text-sm">
            <thead>
              {/* column headers */}
              <tr className="text-[11px] font-bold uppercase tracking-wide text-black">
                <th className={TH}>Personnel</th>
                <th className={TH}>Contact</th>
                <th className={TH}>Area</th>
                <th className={TH}>Performance</th>
                <th className={TH}>Status</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* personnel row */}
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  {/* name + id cell */}
                  <td className="px-3 py-3 break-words">
                    <p className="font-semibold text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-600">{s.id}</p>
                  </td>
                  {/* contact info cell */}
                  <td className="px-3 py-3 break-words">
                    <p className="flex items-center gap-1.5 text-slate-700">
                      <Mail size={12} /> {s.email}
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-600">
                      <Phone size={12} /> {s.phone}
                    </p>
                  </td>
                  {/* delivery area cell */}
                  <td className="px-3 py-3 break-words">
                    <p className="flex items-center gap-1.5 text-slate-700">
                      <MapPin size={12} /> {s.area}
                    </p>
                  </td>
                  {/* performance cell */}
                  <td className="px-3 py-3 break-words">
                    <p className="font-semibold text-slate-700">
                      {s.deliveries} deliveries
                    </p>
                    <p className="flex items-center gap-1 text-xs text-amber-500">
                      <Star
                        size={12}
                        className="fill-amber-400 text-amber-400"
                      />
                      {/* an unrated rider says so rather than showing a 0 that reads as a bad score */}
                      {s.rating > 0 ? `${s.rating} (${s.onTime}%)` : "Not rated"}
                    </p>
                  </td>
                  {/* status badge cell */}
                  <td className="px-3 py-3 break-words">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-3 py-3 break-words">
                    {/* row action buttons */}
                    <div className="flex items-center gap-2">
                      {/* view button */}
                      <button
                        onClick={() => setViewingProfileId(s.profileId)}
                        className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                      >
                        View
                      </button>
                      {s.status === "Active" ? (
                        // block button, shown when currently active
                        <button
                          onClick={() => toggleBlock(s)}
                          className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                        >
                          <Ban size={12} />
                          Block
                        </button>
                      ) : (
                        // unblock/activate button, shown when inactive or blocked
                        <button
                          onClick={() => toggleBlock(s)}
                          className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          <CheckCircle2 size={12} />
                          {s.status === "Inactive" ? "Set Active" : "Unblock"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {/* loading state row */}
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-600">
                    Loading delivery personnel...
                  </td>
                </tr>
              )}
              {/* empty state row */}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-600">
                    No delivery personnel match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* add delivery man modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            {/* modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-black text-slate-900">
                Add Delivery Man
              </h2>
              {/* close modal button */}
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              {/* form fields */}
              <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
                {/* form error banner */}
                {formError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    {formError}
                  </p>
                )}

                {/* full name field */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                    Full Name
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={handleFormChange("name")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* email field */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                      Email
                    </label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={handleFormChange("email")}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
                    />
                  </div>
                  {/* phone field */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={form.phone}
                      onChange={handleFormChange("phone")}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
                    />
                  </div>
                </div>

                {/* delivery area field */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                    Delivery Area
                  </label>
                  <input
                    type="text"
                    value={form.area}
                    onChange={handleFormChange("area")}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* vehicle type field */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                      Vehicle Type
                    </label>
                    <input
                      type="text"
                      value={form.vehicle_type}
                      onChange={handleFormChange("vehicle_type")}
                      placeholder="Motorbike"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
                    />
                  </div>
                  {/* vehicle number field */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      value={form.vehicle_number}
                      onChange={handleFormChange("vehicle_number")}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-green-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* password field */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={handleFormChange("password")}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm outline-none focus:border-green-700"
                      />
                      {/* show/hide password toggle */}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
                      >
                        {showPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                  {/* confirm password field */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        required
                        type={showConfirmPassword ? "text" : "password"}
                        value={form.password_confirmation}
                        onChange={handleFormChange("password_confirmation")}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm outline-none focus:border-green-700"
                      />
                      {/* show/hide confirm password toggle */}
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* modal footer actions */}
              <div className="flex items-center gap-3 border-t border-slate-100 px-6 py-4">
                {/* cancel button */}
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                {/* submit button */}
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 rounded-xl bg-green-700 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-green-800 disabled:opacity-60"
                >
                  {isCreating ? "Adding..." : "Add Delivery Man"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* delivery man detail modal */}
      {viewingProfileId && (
        <DeliveryManDetailModal
          profileId={viewingProfileId}
          onClose={() => setViewingProfileId(null)}
        />
      )}
    </AdminLayout>
  );
};

// modal showing a delivery man's profile plus the full order history they have delivered/handled
const DeliveryManDetailModal = ({ profileId, onClose }) => {
  // Load this delivery man and their assigned orders
  const { data, isLoading } = useGetDeliveryStaffDetailQuery(profileId);
  const staffMember = data?.staffMember;
  const orders = data?.orders || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {/* modal header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              {staffMember?.name || "Delivery Man Details"}
            </h2>
            {staffMember && (
              <p className="text-xs text-slate-600">{staffMember.id}</p>
            )}
          </div>
          {/* close modal button */}
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {isLoading && (
            <p className="py-8 text-center text-slate-600">
              Loading details...
            </p>
          )}

          {!isLoading && staffMember && (
            <>
              {/* profile summary */}
              <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <p className="flex items-center gap-1.5 text-slate-600">
                  <Mail size={14} className="text-slate-600" />{" "}
                  {staffMember.email}
                </p>
                <p className="flex items-center gap-1.5 text-slate-600">
                  <Phone size={14} className="text-slate-600" />{" "}
                  {staffMember.phone}
                </p>
                <p className="flex items-center gap-1.5 text-slate-600">
                  <MapPin size={14} className="text-slate-600" />{" "}
                  {staffMember.area}
                </p>
                <p className="flex items-center gap-1.5 text-slate-600">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  {staffMember.rating > 0
                    ? `${staffMember.rating} rating · ${staffMember.onTime}% on-time`
                    : "Not rated yet"}{" "}
                  &middot; {staffMember.deliveries} deliveries
                </p>
                <p className="sm:col-span-2">
                  <StatusBadge status={staffMember.status} />
                </p>
              </div>

              {/* delivered orders list */}
              <div>
                <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                  <Package size={14} /> Orders ({orders.length})
                </h3>
                {orders.length === 0 && (
                  <p className="rounded-xl border border-slate-100 bg-slate-50 py-6 text-center text-sm text-slate-600">
                    No orders assigned to this delivery man yet.
                  </p>
                )}
                <div className="space-y-3">
                  {orders.map((o) => (
                    <div
                      key={o.orderId}
                      className="rounded-xl border border-slate-100 p-4 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-slate-800">{o.orderId}</p>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-600">{formatDate(o.date)}</p>
                      <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs text-slate-600 sm:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-700">
                            Customer:
                          </span>{" "}
                          {o.customer} ({o.customerPhone})
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">
                            Area:
                          </span>{" "}
                          {o.area}
                        </p>
                        <p className="sm:col-span-2">
                          <span className="font-semibold text-slate-700">
                            Address:
                          </span>{" "}
                          {o.shippingAddress}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">
                            Payment:
                          </span>{" "}
                          {o.paymentMethod} ({o.paymentStatus})
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">
                            Amount:
                          </span>{" "}
                          {o.amount} TK
                        </p>
                        <p>
                          <span className="font-semibold text-slate-700">
                            Rider Status:
                          </span>{" "}
                          {toDeliveryStatus(o.riderStatus)}
                        </p>
                      </div>
                      {o.items?.length > 0 && (
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <p className="mb-1 text-xs font-semibold text-slate-700">
                            Items
                          </p>
                          <ul className="space-y-1 text-xs text-slate-600">
                            {o.items.map((item, idx) => (
                              <li key={idx} className="flex justify-between">
                                <span>
                                  {item.name} &times; {item.quantity}
                                </span>
                                <span>{item.lineTotal} TK</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryManagement;
