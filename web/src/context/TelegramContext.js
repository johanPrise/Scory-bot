// web/src/context/TelegramContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';

const TelegramContext = createContext(null);

export const TelegramProvider = ({ children }) => {
  const [telegram, setTelegram] = useState(null);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      setTelegram(tg);
      setUser(tg.initDataUnsafe?.user || null);
      
      // Appliquer le thème Telegram
      document.body.className = tg.colorScheme;
    }
  }, []);
  
  return (
    <TelegramContext.Provider value={{ telegram, user }}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => useContext(TelegramContext);