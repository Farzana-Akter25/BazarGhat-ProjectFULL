import { createContext, useState } from "react";

// search term context
export const SearchContext = createContext();

// Holds the search text so any page can read or change it
export const SearchProvider = ({ children }) => {
  const [search, setSearch] = useState(""); // current search query

  // provider wrapper, exposes search value + setter
  return (
    <SearchContext.Provider value={{ search, setSearch }}>
      {children}
    </SearchContext.Provider>
  );
};