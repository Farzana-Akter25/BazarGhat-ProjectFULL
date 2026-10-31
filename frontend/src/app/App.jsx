import React, { useEffect } from "react";
import { Provider } from "react-redux"; // redux store provider
import { BrowserRouter, useLocation } from "react-router-dom"; // router wrapper + current route hook
import { Toaster } from "react-hot-toast"; // toast notification host

import Routers from "../routes/Routers"; // app route tree
import { store } from "./store"; // redux store instance

import CartProvider from "../context/CartContext"; // cart state context

// Search Context Import
import { SearchProvider } from "../context/SearchContext"; // search state context

// scroll to top on route change Scroll To Top
const ScrollToTop = () => {
  const { pathname } = useLocation(); // current path, triggers effect on change

  // Scroll to the top whenever the page changes
  useEffect(() => {
    window.scrollTo(0, 0); // reset scroll position on navigation
  }, [pathname]);

  return null; // renders nothing
};

// Root component: Redux store, toasts, cart and search providers, and the router
const App = () => {
  return (
    // redux store provider
    <Provider store={store}>

      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        gutter={10}
        containerStyle={{ top: 24 }}
        toastOptions={{ duration: 3000 }}
      />

      {/* Cart Provider */}
      <CartProvider>

        {/* Search Provider */}
        <SearchProvider>

          {/* router wrapper */}
          <BrowserRouter>

            <ScrollToTop /> {/* scroll reset on route change */}

            {/* main app routes */}
            <Routers />

          </BrowserRouter>

        </SearchProvider>

      </CartProvider>

    </Provider>
  );
};

export default App;
