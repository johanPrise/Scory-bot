import React from 'react';
import { useTelegram } from '../context/TelegramContext';

const TelegramButton = ({ onClick, children, ...props }) => {
  const { webApp } = useTelegram();

  if (!webApp) {
    return (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    );
  }

  return (
    <webApp.Button
      text={children}
      onClick={onClick}
      {...props}
    />
  );
};

export default TelegramButton;
