import mongoose from 'mongoose';
import logger from '../utils/logger.js';

// Sélection de l'URI : priorité à MONGO_URL (déjà présent dans le repo),
// puis MONGODB_URI pour compatibilité éventuelle, sinon fallback local.
const DB_URI =
  process.env.MONGO_URL ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/scory-bot';

// Options Mongoose de base. Ajoute/retire selon tes besoins.
const DEFAULT_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoIndex: process.env.NODE_ENV !== 'production',
  serverSelectionTimeoutMS: 30000, // 30 s
};

/**
 * Établit la connexion MongoDB si ce n'est pas déjà fait.
 * Réutilise la connexion existante pour éviter les doublons
 */
export async function connectToDatabase(options = {}) {
  if (mongoose.connection.readyState === 1) {
    // Déjà connecté
    return mongoose.connection;
  }

  const uriToUse = DB_URI;
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    await mongoose.connect(uriToUse, opts);
    logger.info(`✅ MongoDB connectée : ${uriToUse}`);
    return mongoose.connection;
  } catch (err) {
    logger.error('❌ Erreur de connexion MongoDB', err);
    throw err;
  }
}

// Gérer proprement la fermeture lors d'un SIGINT ou SIGTERM
if (process.env.NODE_ENV !== 'test') {
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    logger.info('🔌 Connexion MongoDB fermée (SIGINT)');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await mongoose.connection.close();
    logger.info('🔌 Connexion MongoDB fermée (SIGTERM)');
    process.exit(0);
  });
}
