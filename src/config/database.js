import mongoose from 'mongoose';
import logger from '../utils/logger.js';

let isConnected = false;

/**
 * Connexion à la base de données MongoDB
 */
export const connectToDatabase = async () => {
  if (isConnected) {
    logger.debug('Déjà connecté à la base de données');
    return;
  }

  const mongoUrl = process.env.MONGO_URL;
  
  if (!mongoUrl) {
    throw new Error('MONGO_URL n\'est pas défini dans les variables d\'environnement');
  }

  try {
    const options = {
      // Options Mongoose 8.x (la plupart des anciennes options sont maintenant par défaut)
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(mongoUrl, options);
    isConnected = true;
    
    logger.info(`✅ MongoDB connecté: ${mongoUrl.replace(/\/\/.*@/, '//***@')}`);

    // Gestion des événements de connexion
    mongoose.connection.on('error', (err) => {
      logger.error('Erreur MongoDB:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB déconnecté');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnecté');
      isConnected = true;
    });

  } catch (error) {
    isConnected = false;
    logger.error(`❌ Échec de connexion MongoDB: ${error.message}`);
    throw error;
  }
};

/**
 * Ferme la connexion à la base de données
 */
export const disconnectDatabase = async () => {
  if (!isConnected) return;
  
  await mongoose.connection.close();
  isConnected = false;
  logger.info('MongoDB déconnecté proprement');
};

export default { connectToDatabase, disconnectDatabase };
