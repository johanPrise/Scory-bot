/**
 * Configuration du bot Telegram
 * Ce fichier centralise tous les paramètres de configuration du bot Telegram
 * pour une meilleure maintenabilité et une configuration multi-environnements.
 */

export const TELEGRAM_CONFIG = {
  // Options de polling (utilisé en développement)
  POLLING_OPTIONS: {
    interval: 300, // Intervalle de vérification des mises à jour (en ms)
    autoStart: false, // Ne pas démarrer automatiquement le polling
    params: {
      timeout: 10, // Timeout pour les requêtes longues (en secondes)
      limit: 100, // Nombre maximum de mises à jour à récupérer
      allowed_updates: [
        'message', 
        'callback_query', 
        'inline_query', 
        'chosen_inline_result',
        'pre_checkout_query',
        'shipping_query',
        'poll',
        'poll_answer',
        'my_chat_member',
        'chat_member',
        'chat_join_request'
      ]
    },
    retryAfter: 5, // Secondes à attendre en cas d'erreur
    stopCallback: null, // Callback à exécuter à l'arrêt du polling
    abort: false // Permet d'arrêter le polling si nécessaire
  },

  // Options de webhook (utilisé en production)
  WEBHOOK_OPTIONS: {
    host: process.env.WEBHOOK_HOST || '0.0.0.0',
    port: process.env.PORT || 3000,
    key: process.env.WEBHOOK_KEY_PATH, // Chemin vers la clé privée SSL
    cert: process.env.WEBHOOK_CERT_PATH, // Chemin vers le certificat SSL
    pfx: process.env.WEBHOOK_PFX_PATH, // Alternative à key+cert (PFX/PKCS12)
    autoOpen: true, // Ouvrir le serveur immédiatement
    httpAgent: null, // Agent HTTP personnalisé
    https: null, // Options HTTPS personnalisées
    healthEndpoint: '/health', // Endpoint de vérification de santé
    maxConnections: 100, // Nombre maximum de connexions simultanées
    dropPendingUpdates: false, // Ignorer les mises à jour en attente au démarrage
    secretToken: process.env.WEBHOOK_SECRET_TOKEN, // Pour la validation des requêtes
    ipv6: true, // Activer IPv6
    tlsOptions: {
      // Options TLS supplémentaires
      minVersion: 'TLSv1.2',
      ciphers: 'TLS_AES_256_GCM_SHA384',
      honorCipherOrder: true
    }
  },

  // Configuration des commandes du bot avec des catégories
  COMMANDS: [
    // Commandes de base
    { command: 'start', description: 'Démarrer le bot et afficher le message de bienvenue' },
    { command: 'help', description: 'Afficher l\'aide et la liste des commandes disponibles' },
    { command: 'link', description: 'Lier votre compte Telegram à votre compte Scory' },
    
    // Commandes d'activités
    { command: 'activities', description: 'Lister toutes vos activités' },
    { command: 'activity', description: 'Gérer une activité spécifique' },
    { command: 'create_activity', description: 'Créer une nouvelle activité' },
    { command: 'join_activity', description: 'Rejoindre une activité existante' },
    
    // Commandes de scores et classements
    { command: 'score', description: 'Enregistrer un score pour une activité' },
    { command: 'scores', description: 'Voir les scores d\'une activité' },
    { command: 'ranking', description: 'Voir le classement d\'une activité' },
    { command: 'leaderboard', description: 'Voir le classement général' },
    
    // Commandes d'équipes
    { command: 'teams', description: 'Lister les équipes' },
    { command: 'create_team', description: 'Créer une nouvelle équipe' },
    { command: 'join_team', description: 'Rejoindre une équipe' },
    { command: 'team', description: 'Gérer votre équipe' },
    
    // Commandes de paramètres
    { command: 'settings', description: 'Afficher et modifier vos paramètres' },
    { command: 'profile', description: 'Afficher et modifier votre profil' },
    { command: 'notifications', description: 'Gérer vos préférences de notification' },
    
    // Commandes d'administration (uniquement pour les administrateurs)
    { command: 'admin', description: 'Commandes d\'administration' },
    { command: 'users', description: 'Gérer les utilisateurs (admin)' },
    { command: 'broadcast', description: 'Envoyer une annonce à tous les utilisateurs (admin)' },
    
    // Commandes d'aide et support
    { command: 'tutorial', description: 'Voir le tutoriel d\'utilisation' },
    { command: 'support', description: 'Contacter le support technique' },
    { command: 'feedback', description: 'Donner votre avis sur le bot' },
    { command: 'report', description: 'Signaler un problème ou un abus' },
    
    // Commandes système
    { command: 'status', description: 'Voir l\'état du bot' },
    { command: 'uptime', description: 'Voir depuis combien de temps le bot est en ligne' },
    { command: 'version', description: 'Afficher la version du bot' },
    { command: 'changelog', description: 'Afficher les dernières modifications' }
  ],

  // Paramètres de limitation de débit (rate limiting)
  RATE_LIMIT: {
    enabled: true, // Activer/désactiver la limitation de débit
    window: 1000, // Fenêtre de temps en ms (1 seconde)
    limit: 1, // Nombre maximum de requêtes par fenêtre
    keyGenerator: (ctx) => {
      // Génère une clé unique par utilisateur et type de chat
      return `${ctx.from?.id}:${ctx.chat?.type}:${ctx.chat?.id}`;
    },
    onLimitExceeded: async (ctx) => {
      const userId = ctx.from?.id;
      const chatType = ctx.chat?.type || 'unknown';
      const command = ctx.message?.text || 'unknown';
      
      // Enregistrer l'événement de dépassement
      console.warn(`[RATE_LIMIT] Dépassement pour l'utilisateur ${userId} dans ${chatType} avec la commande: ${command}`);
      
      // Répondre à l'utilisateur
      try {
        await ctx.reply('⚠️ Trop de requêtes. Veuillez patienter un instant avant de réessayer...');
      } catch (error) {
        console.error('Erreur lors de l\'envoi du message de rate limit:', error);
      }
      
      return false; // Empêcher le traitement de la commande
    },
    // Configuration des limites spécifiques par type de commande
    limits: {
      default: { window: 1000, limit: 1 },
      auth: { window: 10000, limit: 3 }, // Moins de tentatives pour l'authentification
      admin: { window: 1000, limit: 5 }, // Plus de flexibilité pour les admins
      media: { window: 1000, limit: 2 }  // Limiter les requêtes coûteuses en ressources
    }
  },

  // Paramètres de journalisation avancés
  LOGGING: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    format: '[:date[iso]] [:level] :message',
    file: {
      error: 'logs/telegram-error.log',
      combined: 'logs/telegram-combined.log',
      debug: process.env.NODE_ENV === 'development' ? 'logs/telegram-debug.log' : null
    },
    maxSize: '10M',
    maxFiles: 5
  },

  // Configuration du cache
  CACHE: {
    ttl: 300, // Durée de vie du cache en secondes
    max: 100 // Nombre maximum d'entrées en cache
  },

  // Paramètres de sécurité
  SECURITY: {
    allowedUpdates: ['message', 'callback_query', 'chat_member', 'my_chat_member'],
    maxCallbackQueryAnswerLength: 200,
    maxMessageLength: 4096,
    maxCaptionLength: 1024
  },

  // Paramètres de localisation
  LOCALIZATION: {
    defaultLanguage: 'fr',
    availableLanguages: ['fr', 'en'],
    directory: 'locales'
  },

  // Configuration du mode maintenance
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true' || false,
  MAINTENANCE_MESSAGE: '⚠️ Le bot est actuellement en maintenance. Veuillez réessayer plus tard.'
};

// Configuration par environnement
export const ENV_CONFIG = {
  development: {
    webhook: false,
    debug: true,
    logLevel: 'debug',
    polling: true
  },
  production: {
    webhook: true,
    debug: false,
    logLevel: 'warn',
    polling: false
  }
};

// Exporter la configuration en fonction de l'environnement
export default {
  ...TELEGRAM_CONFIG,
  ...(process.env.NODE_ENV === 'production' 
    ? ENV_CONFIG.production 
    : ENV_CONFIG.development)
};
