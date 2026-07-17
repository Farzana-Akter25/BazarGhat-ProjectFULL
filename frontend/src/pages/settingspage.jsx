import React, { useState } from "react";
import { ArrowLeft } from "lucide-react"; // ব্যাক আইকনের জন্য

const SettingsPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // আগের পেজে ফিরে যাওয়ার ফাংশন
  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        
        {/* ব্যাক বাটন এবং টাইটেল সেকশন */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={handleBack}
            className="p-2 bg-white rounded-full shadow-sm border border-gray-200 hover:bg-gray-100 transition-all active:scale-90"
            title="Go Back"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Account Settings</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* বাম পাশের সেকশন: প্রোফাইল পিকচার */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center h-fit">
            <div className="w-32 h-32 bg-gray-200 rounded-full mb-4 overflow-hidden border-4 border-orange-100">
              <div className="flex items-center justify-center h-full text-4xl text-gray-400 font-bold">
                {formData.name ? formData.name[0].toUpperCase() : "F"}
              </div>
            </div>
            <button className="text-orange-500 font-medium hover:underline text-sm">
              Change Photo
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">JPG, GIF or PNG. Max size of 2MB</p>
          </div>

          {/* ডান পাশের সেকশন: মূল ফর্ম */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">Profile Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      name="name"
                      type="text"
                      className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      placeholder="Farzana Akter" 
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                      name="email"
                      type="email"
                      className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      placeholder="farzana@example.com"
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                      name="phone"
                      type="text"
                      className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      placeholder="01947938237"
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input
                      name="address"
                      type="text"
                      className="w-full border border-gray-300 p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      placeholder="Uttara sector 10"
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* পাসওয়ার্ড সেকশন */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">Security</h2>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-700">Password</p>
                  <p className="text-sm text-gray-500">Last changed 3 months ago</p>
                </div>
                <button className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                  Change Password
                </button>
              </div>
            </div>

            {/* সেভ বাটন */}
            <div className="flex justify-end gap-3">
              <button 
                onClick={handleBack}
                className="px-6 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-2 rounded-lg font-medium shadow-md transition-all active:scale-95">
                Save Changes
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;