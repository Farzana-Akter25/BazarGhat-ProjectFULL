import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  MapPin,
  Trash2,
  Home,
  Briefcase,
  Phone,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import notify from "../../utils/notify"; // shared toast notifications
import ConfirmDialog from "../../components/shared/ConfirmDialog";
import DataTable, { TD } from "../../components/shared/DataTable"; // shared table shell

// saved address table columns
const ADDRESS_COLUMNS = [
  { label: "#" },
  { label: "Type" },
  { label: "Recipient" },
  { label: "Phone" },
  { label: "Address" },
  { label: "Instruction / Note" },
  { label: "Action" },
];

// Saved addresses page (stored in the browser)
const AddressesPage = ({ role = "user" }) => {
  // Router helper
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]); // saved address list
  const [showForm, setShowForm] = useState(false); // new address form toggle
  const [deletingAddress, setDeletingAddress] = useState(null); // address pending delete confirm

  // new address form state
  const [form, setForm] = useState({
    type: "Home",
    name: "",
    phone: "",
    details: "",
    area: "",
    city: "",
    note: "",
  });

  // 🔥 LOAD + AUTO SYNC FROM SETTINGS + LOCAL ADDRESSES
  useEffect(() => {
    // Read saved addresses and settings from the browser
    const loadData = () => {
      const savedAddresses =
        JSON.parse(localStorage.getItem("userAddresses")) || [];

      const settings = JSON.parse(localStorage.getItem("settingsData"));

      // 👉 AUTO ADD SETTINGS ADDRESS AS DEFAULT
      let merged = [...savedAddresses];

      if (settings?.address) {
        const exists = merged.find((a) => a.isDefault); // existing default entry, if any

        // default address built from account settings
        const defaultAddress = {
          id: "default",
          type: "Home",
          name: settings.name,
          phone: settings.phone,
          details: settings.address,
          area: "",
          city: "",
          note: "Cash on delivery to this address.",
          isDefault: true,
        };

        if (exists) {
          // replace stale default with fresh one
          merged = merged.map((a) =>
            a.isDefault ? defaultAddress : a
          );
        } else {
          // no default yet, add to front
          merged.unshift(defaultAddress);
        }
      }

      setAddresses(merged);
    };

    loadData();

    // 🔥 listen live update
    window.addEventListener("storage", loadData);

    return () => window.removeEventListener("storage", loadData);
  }, []);

  // INPUT CHANGE
  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // ADD ADDRESS
  const handleAdd = () => {
    if (!form.name || !form.phone || !form.details || !form.area || !form.city) {
      notify.warning("Fill in all required fields");
      return;
    }

    // new address record with unique id
    const newAddress = {
      id: Date.now(),
      ...form,
    };

    const updated = [newAddress, ...addresses.filter(a => !a.isDefault)]; // keep default separate, prepend new

    setAddresses(updated);

    localStorage.setItem("userAddresses", JSON.stringify(updated));

    // reset form back to blank
    setForm({
      type: "Home",
      name: "",
      phone: "",
      details: "",
      area: "",
      city: "",
      note: "",
    });

    setShowForm(false);
  };

  // DELETE (NOT ALLOW DEFAULT DELETE)
  const confirmDelete = () => {
    if (!deletingAddress) return;

    // Remove the deleted address from the list
    const updated = addresses.filter((a) => a.id !== deletingAddress.id);

    setAddresses(updated);

    localStorage.setItem("userAddresses", JSON.stringify(updated));
    setDeletingAddress(null);
  };

  return (
    // full page bg
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          {/* back button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-all"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          {/* page title */}
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <MapPin className="text-orange-500" /> Addresses
          </h1>

          {role === "user" && (
            // add address button, user role only
            <button
              onClick={() => setShowForm(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus size={18} /> Add Address
            </button>
          )}
        </div>

        {/* FORM SECTION */}
        {showForm && (
          // new address card
          <div className="bg-white p-6 rounded-xl mb-6 shadow-md border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              {/* form title */}
              <h2 className="font-bold text-gray-700">Add New Address</h2>
              {/* close form button */}
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* address input fields */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* full name input */}
              <input name="name" placeholder="Full Name *" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200" onChange={handleChange} value={form.name} />
              {/* phone input */}
              <input name="phone" placeholder="Phone *" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200" onChange={handleChange} value={form.phone} />
              {/* house/road input */}
              <input name="details" placeholder="House/Flat/Road *" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200" onChange={handleChange} value={form.details} />
              {/* area input */}
              <input name="area" placeholder="Area *" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200" onChange={handleChange} value={form.area} />
              {/* city input */}
              <input name="city" placeholder="City *" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200" onChange={handleChange} value={form.city} />

              {/* ✅ Custom Note Field (Textarea for more space) */}
              <textarea
                name="note"
                placeholder="Write any specific delivery instructions here..."
                className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200 md:col-span-2 h-20"
                onChange={handleChange}
                value={form.note}
              />
            </div>

            {/* submit new address button */}
            <button
              onClick={handleAdd}
              className="mt-6 px-4 py-3 rounded-xl text-white w-full bg-green-700 hover:bg-green-800 font-bold transition-all shadow-lg"
            >
              Confirm Address
            </button>
          </div>
        )}

        {/* ADDRESS LIST */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-gray-800">Saved Addresses</h3>
          <DataTable
            columns={ADDRESS_COLUMNS}
            isEmpty={addresses.length === 0}
            emptyText="No address found"
          >
            {/* address row */}
            {addresses.map((a, idx) => (
              <tr key={a.id} className="align-top hover:bg-gray-50">
                {/* row number cell */}
                <td className={`${TD} text-gray-500`}>{idx + 1}</td>
                {/* address type cell, with home/office icon */}
                <td className={TD}>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-orange-50 p-1.5 text-orange-500">
                      {a.type === "Home" ? <Home size={15} /> : <Briefcase size={15} />}
                    </span>
                    <span className="font-bold whitespace-nowrap text-gray-800">
                      {a.isDefault ? "Default Address" : a.type}
                    </span>
                  </div>
                </td>
                {/* recipient name cell */}
                <td className={`${TD} font-semibold text-gray-700`}>{a.name}</td>
                {/* phone number cell */}
                <td className={TD}>
                  <span className="flex items-center gap-2 whitespace-nowrap text-gray-600">
                    <Phone size={13} className="text-gray-400" /> {a.phone}
                  </span>
                </td>
                {/* full address cell */}
                <td className={`${TD} max-w-xs leading-relaxed text-gray-600`}>
                  {a.details}, {a.area}, {a.city}
                </td>
                {/* delivery instruction note cell */}
                <td className={`${TD} max-w-xs`}>
                  {a.note ? (
                    <span className="block rounded-lg border-l-4 border-green-700 bg-blue-50 p-2 text-xs text-orange-700">
                      {a.note}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                {/* delete action cell */}
                <td className={TD}>
                  {role === "user" && !a.isDefault ? (
                    // delete address button, non-default only
                    <button
                      onClick={() => setDeletingAddress(a)}
                      title="Delete address"
                      className="rounded-lg bg-red-50 p-1.5 text-red-500 transition-colors hover:bg-red-100"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>

      </div>

      {/* delete confirm dialog */}
      <ConfirmDialog
        open={!!deletingAddress}
        title="Delete Address"
        message="Are you sure you want to delete this address? This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeletingAddress(null)}
      />
    </div>
  );
};

export default AddressesPage;
