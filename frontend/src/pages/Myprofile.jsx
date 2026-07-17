import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Camera, Edit, Save, ArrowLeft } from "lucide-react";

const Myprofile = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);

  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    image: null,
  });

  // ✅ REAL-TIME SYNC
  useEffect(() => {
    const loadData = () => {
      const savedUser = localStorage.getItem("settingsData");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    };

    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, []);

  // INPUT CHANGE
  const handleChange = (e) => {
    const updated = {
      ...user,
      [e.target.name]: e.target.value,
    };
    setUser(updated);
    localStorage.setItem("settingsData", JSON.stringify(updated));
  };

  // IMAGE UPLOAD
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updated = {
          ...user,
          image: reader.result,
        };
        setUser(updated);
        localStorage.setItem("settingsData", JSON.stringify(updated));
      };
      reader.readAsDataURL(file);
    }
  };

  // SAVE BUTTON
  const handleSave = () => {
    setIsEditing(false);
    localStorage.setItem("settingsData", JSON.stringify(user));
    alert("✅ Profile Saved Successfully!");
  };

  return (
    <div className="bg-gray-100 min-h-screen p-6">
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
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-50 flex items-center justify-center bg-gray-50 shadow-inner">
              {user.image ? (
                <img
                  src={user.image}
                  alt="profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-16 h-16 text-gray-300" />
              )}
            </div>

            {/* UPLOAD */}
            <label className="absolute bottom-1 right-1 bg-orange-500 p-2 rounded-full text-white cursor-pointer shadow-lg hover:bg-orange-600 transition-all active:scale-90">
              <Camera className="w-4 h-4" />
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleImageUpload}
              />
            </label>
          </div>

          {/* NAME DISPLAY */}
          {isEditing ? (
            <input
              name="name"
              value={user.name}
              onChange={handleChange}
              className="border-2 border-orange-100 p-2 rounded-xl text-center focus:border-orange-500 outline-none transition-all"
              placeholder="Enter Name"
            />
          ) : (
            <h2 className="text-2xl font-black text-gray-800">{user.name || "User Name"}</h2>
          )}
        </div>

        {/* INFO SECTION */}
        <div className="mt-8 space-y-5">
          <div className="grid grid-cols-1 gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
            {isEditing ? (
              <input
                name="email"
                value={user.email}
                onChange={handleChange}
                className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-orange-500 outline-none"
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-xl text-gray-700 font-medium border border-gray-100">{user.email || "Not set"}</div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Phone Number</label>
            {isEditing ? (
              <input
                name="phone"
                value={user.phone}
                onChange={handleChange}
                className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-orange-500 outline-none"
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-xl text-gray-700 font-medium border border-gray-100">{user.phone || "Not set"}</div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Home Address</label>
            {isEditing ? (
              <textarea
                name="address"
                value={user.address}
                onChange={handleChange}
                className="border-2 border-gray-100 p-3 rounded-xl w-full focus:border-orange-500 outline-none min-h-[100px]"
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-xl text-gray-700 font-medium border border-gray-100">{user.address || "Not set"}</div>
            )}
          </div>
        </div>

        {/* BUTTON */}
        <div className="mt-10 text-center">
          {isEditing ? (
            <button
              onClick={handleSave}
              className="bg-gray-900 text-white px-10 py-3.5 rounded-2xl font-bold flex items-center gap-2 mx-auto hover:bg-black transition-all active:scale-95 shadow-lg"
            >
              <Save size={20} /> Save Profile
            </button>
          ) : (
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