import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Edit, Save, ArrowLeft } from "lucide-react"; // icons
import notify from "../../utils/notify"; // shared toast notifications

// Profile page (details saved in the browser)
const Myprofile = () => {
  const navigate = useNavigate(); // router navigation helper
  const [isEditing, setIsEditing] = useState(false); // toggles view vs edit mode

  // profile fields shown/edited on this page
  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // REAL-TIME SYNC
  useEffect(() => {
    // pulls saved profile from localStorage
    const loadData = () => {
      // Load the saved profile from the browser
      const savedUser = localStorage.getItem("settingsData");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    };

    loadData(); // initial load
    window.addEventListener("storage", loadData); // sync across tabs
    return () => window.removeEventListener("storage", loadData); // cleanup listener
  }, []);

  // INPUT CHANGE
  const handleChange = (e) => {
    // Copy the changed field into the profile
    const updated = {
      ...user,
      [e.target.name]: e.target.value,
    };
    setUser(updated); // update local state
    localStorage.setItem("settingsData", JSON.stringify(updated)); // persist
  };

  // SAVE BUTTON
  const handleSave = () => {
    setIsEditing(false); // back to view mode
    localStorage.setItem("settingsData", JSON.stringify(user)); // persist
    notify.success("Profile updated");
  };

  return (
    // page wrapper
    <div className="bg-gray-100 min-h-screen p-6">
      {/* profile card */}
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl shadow">

        {/* BACK */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 mb-4 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={20} /> Back
        </button>

        {/* PROFILE IMAGE */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {/* avatar circle, placeholder icon only */}
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-50 flex items-center justify-center bg-gray-50 shadow-inner">
              <User className="w-16 h-16 text-gray-300" />
            </div>
          </div>

          {/* NAME DISPLAY */}
          {isEditing ? (
            // editable name input
            <input
              name="name"
              value={user.name}
              onChange={handleChange}
              className="border-2 border-orange-100 p-2 rounded-xl text-center focus:border-orange-500 outline-none transition-all"
              placeholder="Enter Name"
            />
          ) : (
            // read-only name heading
            <h2 className="text-2xl font-black text-gray-800">{user.name || "User Name"}</h2>
          )}
        </div>

        {/* INFO SECTION */}
        <div className="mt-8 space-y-5">
          {/* email row */}
          <div className="grid grid-cols-1 gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
            {isEditing ? (
              // editable email input
              <input
                name="email"
                value={user.email}
                onChange={handleChange}
                className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-orange-500 outline-none"
              />
            ) : (
              // read-only email display
              <div className="p-3 bg-gray-50 rounded-xl text-gray-700 font-medium border border-gray-100">{user.email || "Not set"}</div>
            )}
          </div>

          {/* phone row */}
          <div className="grid grid-cols-1 gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Phone Number</label>
            {isEditing ? (
              // editable phone input
              <input
                name="phone"
                value={user.phone}
                onChange={handleChange}
                className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-orange-500 outline-none"
              />
            ) : (
              // read-only phone display
              <div className="p-3 bg-gray-50 rounded-xl text-gray-700 font-medium border border-gray-100">{user.phone || "Not set"}</div>
            )}
          </div>

          {/* address row */}
          <div className="grid grid-cols-1 gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Home Address</label>
            {isEditing ? (
              // editable address textarea
              <textarea
                name="address"
                value={user.address}
                onChange={handleChange}
                className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-orange-500 outline-none min-h-[100px]"
              />
            ) : (
              // read-only address display
              <div className="p-3 bg-gray-50 rounded-xl text-gray-700 font-medium border border-gray-100">{user.address || "Not set"}</div>
            )}
          </div>
        </div>

        {/* BUTTON */}
        <div className="mt-10 text-center">
          {isEditing ? (
            // save profile button, shown while editing
            <button
              onClick={handleSave}
              className="bg-gray-900 text-white px-10 py-3.5 rounded-2xl font-bold flex items-center gap-2 mx-auto hover:bg-black transition-all active:scale-95 shadow-lg"
            >
              <Save size={20} /> Save Profile
            </button>
          ) : (
            // edit profile button, shown in view mode
            <button
              onClick={() => setIsEditing(true)}
              className="bg-orange-500 text-white px-10 py-3.5 rounded-2xl font-bold flex items-center gap-2 mx-auto hover:bg-orange-600 transition-all active:scale-95 shadow-lg"
            >
              <Edit size={20} /> Edit Profile
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default Myprofile;