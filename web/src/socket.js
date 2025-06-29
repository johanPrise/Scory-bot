import { io } from 'socket.io-client';

// Utilisez la variable d'environnement REACT_APP_API_URL ou fallback localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const socket = io(API_URL, {
  autoConnect: false,
  transports: ['websocket'],
});

export default socket;
