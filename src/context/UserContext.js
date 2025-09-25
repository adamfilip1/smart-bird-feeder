import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // DEMO mód – automatické přihlášení
    const demoUser = { username: 'demo', email: 'demo@example.com' };
    setUser(demoUser);
    localStorage.setItem('user', JSON.stringify(demoUser));
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

