import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { bot } from '../config/bot.js';
import rateLimit from 'express-rate-limit';
import { connectToDatabase } from '../config/database.js';
import logger from '../utils/logger.js';

// Import des routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import teamRoutes from './routes/teams.js';
import activityRoutes from './routes/activities.js';
import scoreRoutes from './routes/scores.js';
import dashboardRoutes from './routes/dashboard.js';
import feedbackRouter from './routes/feedback.js';
import timersRouter from './routes/timers.js';

// Déterminer __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import des middlewares
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import requestLogger from './middleware/requestLogger.js';

/**
 * Crée et configure l'application Express API
 */
export const createApiApp = () => {
  const app = express();

  // Middlewares de sécurité
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));

  // Configuration CORS améliorée
  const defaultOrigins = ['http://localhost:3000', 'http://localhost:3001'];
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];
  const allowedOrigins = [...defaultOrigins, ...envOrigins];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Requêtes internes (postman, server-side) : pas d'origin → OK
        if (!origin) return callback(null, true);

        // Autoriser wildcard Telegram *.telegram.org
        const telegramPattern = /^https:\/\/[a-zA-Z0-9_-]+\.telegram\.org$/;
        if (telegramPattern.test(origin) || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        logger.warn(`CORS bloqué pour l'origine: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limite par IP
    message: {
      error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // Middlewares de parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Middleware de logging des requêtes
  app.use(requestLogger);

  // Endpoint webhook Telegram (doit être avant 404)
  app.post('/telegram/webhook', (req, res) => {
    try {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    } catch (err) {
      logger.error('Erreur lors du traitement du webhook Telegram', err);
      res.sendStatus(500);
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // Routes API
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/activities', activityRoutes);
  app.use('/api/scores', scoreRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/feedback', feedbackRouter);
  app.use('/api/timers', timersRouter);

  // Route 404 pour les endpoints API non trouvés
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: 'Endpoint non trouvé',
      path: req.originalUrl,
      method: req.method,
    });
  });

  // Serveur des fichiers statiques React
  const webAppPath = path.join(__dirname, '../../web/build');
  app.use(express.static(webAppPath));

  // Fallback SPA – renvoie index.html pour toute autre route non API / webhook
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/telegram')) {
      return next();
    }
    res.sendFile(path.join(webAppPath, 'index.html'));
  });

  // Middleware de gestion d'erreurs (doit être en dernier)
  app.use(errorHandler);

  return app;
};

/**
 * Démarre le serveur API
 */
export const startApiServer = async (port = process.env.API_PORT || 3001) => {
  try {
    // Connexion à la base de données
    logger.info('Connexion à la base de données...');
    await connectToDatabase();
    logger.info('✅ Base de données connectée');

    // Création de l'application
    const app = createApiApp();

    // Démarrage du serveur
    const server = app.listen(port, () => {
      logger.info(`🚀 Serveur API démarré sur le port ${port}`);
      logger.info(`📍 Health check: http://localhost:${port}/health`);
      logger.info(`📍 API Base URL: http://localhost:${port}/api`);
    });

    // Gestion propre de l'arrêt
    const shutdown = async (signal) => {
      logger.info(`Signal ${signal} reçu. Arrêt du serveur API...`);
      
      server.close(async () => {
        logger.info('✅ Serveur API arrêté');
        process.exit(0);
      });
    };

    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));

    return server;
  } catch (error) {
    logger.error('❌ Erreur lors du démarrage du serveur API:', error);
    process.exit(1);
  }
};

export default createApiApp;