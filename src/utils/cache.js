import NodeCache from 'node-cache';
import logger from './logger.js';

/**
 * Système de cache multi-niveaux pour optimiser les performances
 */
class CacheManager {
  constructor() {
    // Cache principal (TTL: 5 minutes)
    this.mainCache = new NodeCache({ 
      stdTTL: 300, 
      checkperiod: 60,
      useClones: false 
    });

    // Cache pour les classements (TTL: 2 minutes)
    this.rankingsCache = new NodeCache({ 
      stdTTL: 120, 
      checkperiod: 30,
      useClones: false 
    });

    // Cache pour les statistiques (TTL: 10 minutes)
    this.statsCache = new NodeCache({ 
      stdTTL: 600, 
      checkperiod: 120,
      useClones: false 
    });

    // Cache pour les utilisateurs (TTL: 15 minutes)
    this.userCache = new NodeCache({ 
      stdTTL: 900, 
      checkperiod: 180,
      useClones: false 
    });

    // Événements de cache
    this.setupCacheEvents();
  }

  /**
   * Configuration des événements de cache pour le monitoring
   */
  setupCacheEvents() {
    const caches = {
      main: this.mainCache,
      rankings: this.rankingsCache,
      stats: this.statsCache,
      user: this.userCache
    };

    Object.entries(caches).forEach(([name, cache]) => {
      cache.on('set', (key, value) => {
        logger.debug(`Cache SET [${name}]: ${key}`);
      });

      cache.on('del', (key, value) => {
        logger.debug(`Cache DEL [${name}]: ${key}`);
      });

      cache.on('expired', (key, value) => {
        logger.debug(`Cache EXPIRED [${name}]: ${key}`);
      });
    });
  }

  /**
   * Générer une clé de cache standardisée
   */
  generateKey(prefix, ...parts) {
    return `${prefix}:${parts.filter(p => p !== undefined && p !== null).join(':')}`;
  }

  /**
   * Cache générique avec fonction de récupération
   */
  async getOrSet(cacheType, key, fetchFunction, ttl = null) {
    const cache = this.getCache(cacheType);
    
    // Essayer de récupérer depuis le cache
    const cached = cache.get(key);
    if (cached !== undefined) {
      logger.debug(`Cache HIT [${cacheType}]: ${key}`);
      return cached;
    }

    logger.debug(`Cache MISS [${cacheType}]: ${key}`);

    try {
      // Récupérer les données
      const data = await fetchFunction();
      
      // Mettre en cache
      if (ttl) {
        cache.set(key, data, ttl);
      } else {
        cache.set(key, data);
      }

      return data;
    } catch (error) {
      logger.error(`Erreur lors de la récupération des données pour la clé ${key}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer le cache approprié selon le type
   */
  getCache(type) {
    switch (type) {
      case 'rankings':
        return this.rankingsCache;
      case 'stats':
        return this.statsCache;
      case 'user':
        return this.userCache;
      default:
        return this.mainCache;
    }
  }

  /**
   * Cache pour les classements
   */
  async getRankings(scope, period, activityId, teamId, limit, fetchFunction) {
    const key = this.generateKey('rankings', scope, period, activityId, teamId, limit);
    return this.getOrSet('rankings', key, fetchFunction);
  }

  /**
   * Cache pour les statistiques utilisateur
   */
  async getUserStats(userId, period, fetchFunction) {
    const key = this.generateKey('user_stats', userId, period);
    return this.getOrSet('stats', key, fetchFunction);
  }

  /**
   * Cache pour les statistiques d'équipe
   */
  async getTeamStats(teamId, period, fetchFunction) {
    const key = this.generateKey('team_stats', teamId, period);
    return this.getOrSet('stats', key, fetchFunction);
  }

  /**
   * Cache pour les données utilisateur
   */
  async getUser(userId, fetchFunction) {
    const key = this.generateKey('user', userId);
    return this.getOrSet('user', key, fetchFunction);
  }

  /**
   * Cache pour les équipes
   */
  async getTeam(teamId, includeMembers, fetchFunction) {
    const key = this.generateKey('team', teamId, includeMembers);
    return this.getOrSet('main', key, fetchFunction);
  }

  /**
   * Cache pour les activités
   */
  async getActivity(activityId, includeSubActivities, fetchFunction) {
    const key = this.generateKey('activity', activityId, includeSubActivities);
    return this.getOrSet('main', key, fetchFunction);
  }

  /**
   * Cache pour les listes paginées
   */
  async getPaginatedList(type, page, limit, filters, fetchFunction) {
    const filterKey = Object.keys(filters).sort().map(k => `${k}=${filters[k]}`).join('&');
    const key = this.generateKey('list', type, page, limit, filterKey);
    return this.getOrSet('main', key, fetchFunction);
  }

  /**
   * Invalider le cache pour un utilisateur
   */
  invalidateUser(userId) {
    const patterns = [
      `user:${userId}`,
      `user_stats:${userId}:*`,
      `rankings:*`,
      `team_stats:*`,
      `list:*`
    ];

    this.invalidateByPatterns(patterns);
    logger.info(`Cache invalidé pour l'utilisateur ${userId}`);
  }

  /**
   * Invalider le cache pour une équipe
   */
  invalidateTeam(teamId) {
    const patterns = [
      `team:${teamId}:*`,
      `team_stats:${teamId}:*`,
      `rankings:*`,
      `list:*`
    ];

    this.invalidateByPatterns(patterns);
    logger.info(`Cache invalidé pour l'équipe ${teamId}`);
  }

  /**
   * Invalider le cache pour une activité
   */
  invalidateActivity(activityId) {
    const patterns = [
      `activity:${activityId}:*`,
      `rankings:*`,
      `list:*`
    ];

    this.invalidateByPatterns(patterns);
    logger.info(`Cache invalidé pour l'activité ${activityId}`);
  }

  /**
   * Invalider le cache selon des patterns
   */
  invalidateByPatterns(patterns) {
    const caches = [this.mainCache, this.rankingsCache, this.statsCache, this.userCache];
    
    caches.forEach(cache => {
      const keys = cache.keys();
      
      keys.forEach(key => {
        patterns.forEach(pattern => {
          if (this.matchPattern(key, pattern)) {
            cache.del(key);
          }
        });
      });
    });
  }

  /**
   * Vérifier si une clé correspond à un pattern
   */
  matchPattern(key, pattern) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return key.startsWith(prefix);
    }
    return key === pattern;
  }

  /**
   * Vider tout le cache
   */
  flushAll() {
    this.mainCache.flushAll();
    this.rankingsCache.flushAll();
    this.statsCache.flushAll();
    this.userCache.flushAll();
    logger.info('Tous les caches ont été vidés');
  }

  /**
   * Obtenir les statistiques de cache
   */
  getStats() {
    const getStatsForCache = (cache, name) => ({
      name,
      keys: cache.keys().length,
      hits: cache.getStats().hits,
      misses: cache.getStats().misses,
      hitRate: cache.getStats().hits / (cache.getStats().hits + cache.getStats().misses) || 0
    });

    return {
      main: getStatsForCache(this.mainCache, 'main'),
      rankings: getStatsForCache(this.rankingsCache, 'rankings'),
      stats: getStatsForCache(this.statsCache, 'stats'),
      user: getStatsForCache(this.userCache, 'user'),
      total: {
        keys: this.mainCache.keys().length + 
              this.rankingsCache.keys().length + 
              this.statsCache.keys().length + 
              this.userCache.keys().length
      }
    };
  }

  /**
   * Middleware Express pour le cache
   */
  middleware(options = {}) {
    const { 
      ttl = 300, 
      keyGenerator = (req) => `${req.method}:${req.originalUrl}`,
      condition = () => true 
    } = options;

    return async (req, res, next) => {
      // Vérifier si on doit utiliser le cache
      if (!condition(req) || req.method !== 'GET') {
        return next();
      }

      const key = keyGenerator(req);
      const cached = this.mainCache.get(key);

      if (cached) {
        logger.debug(`Cache middleware HIT: ${key}`);
        return res.json(cached);
      }

      // Intercepter la réponse
      const originalSend = res.json;
      res.json = (data) => {
        // Mettre en cache la réponse
        this.mainCache.set(key, data, ttl);
        logger.debug(`Cache middleware SET: ${key}`);
        
        // Envoyer la réponse
        originalSend.call(res, data);
      };

      next();
    };
  }
}

// Instance singleton
const cacheManager = new CacheManager();

export default cacheManager;

// Exports pour les fonctions utilitaires
export const {
  getRankings,
  getUserStats,
  getTeamStats,
  getUser,
  getTeam,
  getActivity,
  getPaginatedList,
  invalidateUser,
  invalidateTeam,
  invalidateActivity,
  flushAll,
  getStats,
  middleware
} = cacheManager;