// web/src/components/TelegramButton.js
import React from 'react';
import { useTelegram } from '../context/TelegramContext';

const TelegramButton = ({ children, onClick, ...props }) => {
  const { telegram } = useTelegram();
  
  // Utiliser le style natif de Telegram si disponible
  const buttonStyle = telegram ? {
    backgroundColor: telegram.themeParams.button_color,
    color: telegram.themeParams.button_text_color
  } : {};
  
  return (
    <button 
      style={buttonStyle} 
      onClick={onClick} 
      {...props}
    >
      {children}
    </button>
  );
};

export default TelegramButton;