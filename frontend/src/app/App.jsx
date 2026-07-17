import React, { useEffect } from "react";
import { Provider } from "react-redux";
import { BrowserRouter, useLocation } from "react-router-dom";

import Routers from "../routes/Routers";
import { store } from "./store";

import CartProvider from "../context/CartContext";

// ✅ Search Context Import
import { SearchProvider } from "../context/SearchContext";

// ✅ Scroll To Top
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App = () => {
  return (
    <Provider store={store}>

      {/* ✅ Cart Provider */}
      <CartProvider>

        {/* ✅ Search Provider */}
        <SearchProvider>

          <BrowserRouter>

            <ScrollToTop />

            <Routers />

          </BrowserRouter>

        </SearchProvider>

      </CartProvider>

    </Provider>
  );
};

export default App;