import React from "react";
// Import gulo thakbe, kintu Header/Footer proyojon nei jodi Layout-e thake
import Navbar from "../../components/HomePage/Navbar";
import Hero from "../../components/HomePage/Hero";
import Product from "../../components/HomePage/Product";

const HomePage = () => {
  return (
    <div className="bg-white min-h-screen">
      
      {/* 🟢 Header soriye deya hoyeche, eita Layout theke ashbe */}

      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Products Section */}
      <Product />

      {/* 🔴 Footer-o soriye dite hobe, naile Footer-o double dekhabe */}

    </div>
  );
};

export default HomePage;