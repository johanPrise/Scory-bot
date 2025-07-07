import React, { createContext, useContext, useEffect, useState } from 'react';

const TelegramContext = createContext({});

export const TelegramProvider = ({ children }) => {
  const [webApp, setWebApp] = useState(null);
  const [initData, setInitData] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const tgWebApp = window.Telegram?.WebApp;
    if (tgWebApp) {
      setWebApp(tgWebApp);
      setInitData(tgWebApp.initData || '');
      
      // Parse user data from initData if available
      try {
        const urlParams = new URLSearchParams(tgWebApp.initData);
        const userData = urlParams.get('user');
        if (userData) {
          setUser(JSON.parse(decodeURIComponent(userData)));
        }
      } catch (error) {
        console.error('Error parsing Telegram user data:', error);
      }

      // Expand the web app to full view
      tgWebApp.expand();
    }
  }, []);

  const value = {
    webApp,
    initData,
    user,
    isTelegramWebApp: !!webApp,
  };

  return (
    <TelegramContext.Provider value={value}>
      {children}
    </TelegramContext.Provider>
  );
};

export const useTelegram = () => {
  return useContext(TelegramContext);
};

export default TelegramContext;
