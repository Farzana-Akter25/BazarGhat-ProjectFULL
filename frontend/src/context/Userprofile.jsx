import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

const KEY = "userData";

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    image: "",
  });

  // LOAD SAFE
  useEffect(() => {
    const saved = localStorage.getItem(KEY);

    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem(KEY);
      }
    }
  }, []);

  // AUTO SAVE
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(user));
  }, [user]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};