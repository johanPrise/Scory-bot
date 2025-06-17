import dotenv from 'dotenv';
import { startApiServer } from './src/api/index.js';
import logger from './src/utils/logger.js';

// Charger les variables d'environnement
dotenv.config();

/**
 * Point d'entrée principal pour le serveur API
 */
async function main() {
  try {
    logger.info('🚀 Démarrage du serveur API Scory-bot...');
    
    // Vérifier les variables d'environnement essentielles
    const requiredEnvVars = ['MONGO_URL'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      throw new Error(`Variables d'environnement manquantes: ${missingEnvVars.join(', ')}`);
    }

    // Démarrer le serveur API
    const port = process.env.API_PORT || 3001;
    await startApiServer(port);
    
    logger.info('✅ Serveur API démarré avec succès');
    
  } catch (error) {
    logger.error('❌ Erreur lors du démarrage du serveur API:', error);
    process.exit(1);
  }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION:', { reason, promise });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

// Démarrer l'application
main();