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

const AddressesPage = ({ role = "user" }) => {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [showForm, setShowForm] = useState(false);

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
    const loadData = () => {
      const savedAddresses =
        JSON.parse(localStorage.getItem("userAddresses")) || [];

      const settings = JSON.parse(localStorage.getItem("settingsData"));

      // 👉 AUTO ADD SETTINGS ADDRESS AS DEFAULT
      let merged = [...savedAddresses];

      if (settings?.address) {
        const exists = merged.find((a) => a.isDefault);

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
          merged = merged.map((a) =>
            a.isDefault ? defaultAddress : a
          );
        } else {
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
      alert("⚠️ Please fill all required fields!");
      return;
    }

    const newAddress = {
      id: Date.now(),
      ...form,
    };

    const updated = [newAddress, ...addresses.filter(a => !a.isDefault)];

    setAddresses(updated);

    localStorage.setItem("userAddresses", JSON.stringify(updated));

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
  const handleDelete = (id) => {
    const updated = addresses.filter((a) => a.id !== id);

    setAddresses(updated);

    localStorage.setItem("userAddresses", JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-all"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
            <MapPin className="text-orange-500" /> Addresses
          </h1>

          {role === "user" && (
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
          <div className="bg-white p-6 rounded-xl mb-6 shadow-md border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-700">Add New Address</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <input name="name" placeholder="Full Name *" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200" onChange={handleChange} value={form.name} />
              <input name="phone" placeholder="Phone *" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200" onChange={handleChange} value={form.phone} />
              <input name="details" placeholder="House/Flat/Road *" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200" onChange={handleChange} value={form.details} />
              <input name="area" placeholder="Area *" className="p-3 border rounded-xl outline-none focus:ring-2 focus:ring-orange-200" onChange={handleChange} value={form.area} />
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

            <button
              onClick={handleAdd}
              className="mt-6 px-4 py-3 rounded-xl text-white w-full bg-green-600 hover:bg-green-700 font-bold transition-all shadow-lg"
            >
              Confirm Address
            </button>
          </div>
        )}

        {/* ADDRESS LIST */}
        <div className="grid gap-4">
          {addresses.length === 0 && (
            <div className="bg-white p-10 rounded-xl text-center shadow-sm border border-dashed border-gray-300">
              <p className="text-gray-500">No address found</p>
            </div>
          )}

          {addresses.map((a) => (
            <div key={a.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
                    {a.type === "Home" ? <Home size={20} /> : <Briefcase size={20} />}
                  </div>
                  <div>
                    <span className="font-bold text-gray-800">
                      {a.isDefault ? "Default Address" : a.type}
                    </span>
                    <h2 className="font-semibold text-gray-700 mt-1">{a.name}</h2>
                  </div>
                </div>

                {role === "user" && !a.isDefault && (
                  <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-2 ml-12">
                <p className="flex items-center gap-2 text-gray-600 text-sm">
                  <Phone size={14} className="text-gray-400" /> {a.phone}
                </p>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {a.details}, {a.area}, {a.city}
                </p>

                {/* ✅ DISPLAYING THE NOTE (FIXED) */}
                {a.note && (
                  <div className="bg-blue-50 p-3 rounded-lg mt-3 border-l-4 border-green-400">
                    <p className="text-xs text-orange-700">
                      <span className="font-bold block mb-1">Instruction/Note:</span>
                      {a.note}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default AddressesPage;