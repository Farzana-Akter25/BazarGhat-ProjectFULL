import React from "react";

import Navbar from "../../components/home/Navbar"; // top nav bar
import Hero from "../../components/home/Hero"; // hero banner section
import Product from "../../components/home/Product"; // product listing grid

// Home page: banner, categories and product sections
const HomePage = () => {
  return (
    // page wrapper
    <div className="bg-white min-h-screen">

      

      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <Hero />

      {/* Products Section */}
      <Product />

      

    </div>
  );
};

export default HomePage;