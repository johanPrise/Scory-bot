import EventEmitter from 'events';
import logger from './logger.js';
import cacheManager from './cache.js';

/**
 * Système d'analytics et monitoring pour Scory-bot
 */
class AnalyticsManager extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.events = [];
    this.startTime = Date.now();
    
    // Configuration
    this.config = {
      maxEvents: 10000,
      metricsRetention: 24 * 60 * 60 * 1000, // 24 heures
      aggregationInterval: 60 * 1000, // 1 minute
    };

    // Démarrer l'agrégation périodique
    this.startAggregation();
  }

  /**
   * Enregistrer un événement
   */
  track(event, data = {}) {
    const eventData = {
      event,
      data,
      timestamp: Date.now(),
      id: this.generateEventId()
    };

    this.events.push(eventData);
    this.emit('event', eventData);

    // Nettoyer les anciens événements
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    logger.debug(`Analytics event: ${event}`, data);
  }

  /**
   * Incrémenter une métrique
   */
  increment(metric, value = 1, tags = {}) {
    const key = this.getMetricKey(metric, tags);
    const current = this.metrics.get(key) || { count: 0, sum: 0, min: Infinity, max: -Infinity };
    
    current.count += 1;
    current.sum += value;
    current.min = Math.min(current.min, value);
    current.max = Math.max(current.max, value);
    current.lastUpdate = Date.now();

    this.metrics.set(key, current);
    
    this.track('metric_increment', { metric, value, tags });
  }

  /**
   * Enregistrer une durée
   */
  timing(metric, duration, tags = {}) {
    this.increment(`${metric}.duration`, duration, tags);
    this.track('timing', { metric, duration, tags });
  }

  /**
   * Enregistrer une erreur
   */
  error(error, context = {}) {
    this.increment('errors.total');
    this.increment(`errors.${error.name || 'unknown'}`);
    
    this.track('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      context
    });

    logger.error('Analytics error tracked:', error, context);
  }

  /**
   * Middleware pour tracker les requêtes API
   */
  apiMiddleware() {
    return (req, res, next) => {
      const start = Date.now();
      const originalSend = res.send;

      // Tracker le début de la requête
      this.track('api_request_start', {
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.userId
      });

      this.increment('api.requests.total');
      this.increment(`api.requests.${req.method.toLowerCase()}`);

      // Intercepter la réponse
      res.send = function(data) {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;

        // Tracker la fin de la requête
        this.track('api_request_end', {
          method: req.method,
          path: req.path,
          statusCode,
          duration,
          userId: req.userId
        });

        this.increment('api.responses.total');
        this.increment(`api.responses.${Math.floor(statusCode / 100)}xx`);
        this.timing('api.response_time', duration, {
          method: req.method,
          path: req.path
        });

        // Tracker les erreurs
        if (statusCode >= 400) {
          this.increment('api.errors.total');
          this.increment(`api.errors.${statusCode}`);
        }

        originalSend.call(this, data);
      }.bind(this);

      next();
    };
  }

  /**
   * Tracker les événements utilisateur
   */
  trackUser(userId, event, data = {}) {
    this.track('user_event', {
      userId,
      event,
      ...data
    });

    this.increment('users.events.total');
    this.increment(`users.events.${event}`);
  }

  /**
   * Tracker les événements d'équipe
   */
  trackTeam(teamId, event, data = {}) {
    this.track('team_event', {
      teamId,
      event,
      ...data
    });

    this.increment('teams.events.total');
    this.increment(`teams.events.${event}`);
  }

  /**
   * Tracker les événements de score
   */
  trackScore(scoreData) {
    this.track('score_event', scoreData);
    
    this.increment('scores.total');
    this.increment(`scores.${scoreData.context}`);
    this.increment('scores.points', scoreData.value);
  }

  /**
   * Tracker les commandes Telegram
   */
  trackTelegramCommand(command, userId, chatId, success = true) {
    this.track('telegram_command', {
      command,
      userId,
      chatId,
      success
    });

    this.increment('telegram.commands.total');
    this.increment(`telegram.commands.${command}`);
    
    if (!success) {
      this.increment('telegram.commands.errors');
    }
  }

  /**
   * Obtenir les métriques actuelles
   */
  getMetrics(filter = null) {
    const result = {};
    
    for (const [key, value] of this.metrics.entries()) {
      if (!filter || key.includes(filter)) {
        result[key] = {
          ...value,
          average: value.count > 0 ? value.sum / value.count : 0
        };
      }
    }

    return result;
  }

  /**
   * Obtenir les événements récents
   */
  getRecentEvents(limit = 100, filter = null) {
    let events = this.events.slice(-limit);
    
    if (filter) {
      events = events.filter(event => 
        event.event.includes(filter) || 
        JSON.stringify(event.data).includes(filter)
      );
    }

    return events.reverse(); // Plus récents en premier
  }

  /**
   * Obtenir les statistiques système
   */
  getSystemStats() {
    const uptime = Date.now() - this.startTime;
    const memUsage = process.memoryUsage();
    const cacheStats = cacheManager.getStats();

    return {
      uptime,
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      cache: cacheStats,
      events: {
        total: this.events.length,
        maxEvents: this.config.maxEvents
      },
      metrics: {
        total: this.metrics.size
      }
    };
  }

  /**
   * Obtenir un rapport d'activité
   */
  getActivityReport(timeRange = 3600000) { // 1 heure par défaut
    const since = Date.now() - timeRange;
    const recentEvents = this.events.filter(event => event.timestamp >= since);

    const report = {
      timeRange,
      totalEvents: recentEvents.length,
      eventTypes: {},
      userActivity: {},
      apiActivity: {
        requests: 0,
        errors: 0,
        averageResponseTime: 0
      },
      telegramActivity: {
        commands: 0,
        errors: 0
      }
    };

    // Analyser les événements
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    recentEvents.forEach(event => {
      // Compter les types d'événements
      report.eventTypes[event.event] = (report.eventTypes[event.event] || 0) + 1;

      // Analyser l'activité utilisateur
      if (event.data.userId) {
        report.userActivity[event.data.userId] = (report.userActivity[event.data.userId] || 0) + 1;
      }

      // Analyser l'activité API
      if (event.event === 'api_request_end') {
        report.apiActivity.requests++;
        if (event.data.statusCode >= 400) {
          report.apiActivity.errors++;
        }
        if (event.data.duration) {
          totalResponseTime += event.data.duration;
          responseTimeCount++;
        }
      }

      // Analyser l'activité Telegram
      if (event.event === 'telegram_command') {
        report.telegramActivity.commands++;
        if (!event.data.success) {
          report.telegramActivity.errors++;
        }
      }
    });

    // Calculer la moyenne des temps de réponse
    if (responseTimeCount > 0) {
      report.apiActivity.averageResponseTime = totalResponseTime / responseTimeCount;
    }

    return report;
  }

  /**
   * Démarrer l'agrégation périodique
   */
  startAggregation() {
    setInterval(() => {
      this.aggregateMetrics();
      this.cleanupOldData();
    }, this.config.aggregationInterval);
  }

  /**
   * Agréger les métriques
   */
  aggregateMetrics() {
    const now = Date.now();
    const hourlyMetrics = new Map();

    // Créer des agrégations horaires
    for (const [key, value] of this.metrics.entries()) {
      const hour = Math.floor(now / (60 * 60 * 1000));
      const hourlyKey = `${key}.hourly.${hour}`;
      
      hourlyMetrics.set(hourlyKey, value);
    }

    // Sauvegarder les métriques horaires
    for (const [key, value] of hourlyMetrics.entries()) {
      this.metrics.set(key, value);
    }

    this.emit('metrics_aggregated', { timestamp: now, count: hourlyMetrics.size });
  }

  /**
   * Nettoyer les anciennes données
   */
  cleanupOldData() {
    const cutoff = Date.now() - this.config.metricsRetention;

    // Nettoyer les métriques anciennes
    for (const [key, value] of this.metrics.entries()) {
      if (value.lastUpdate && value.lastUpdate < cutoff) {
        this.metrics.delete(key);
      }
    }

    // Nettoyer les anciens événements
    this.events = this.events.filter(event => event.timestamp >= cutoff);

    this.emit('cleanup_completed', { 
      timestamp: Date.now(), 
      metricsCount: this.metrics.size,
      eventsCount: this.events.length 
    });
  }

  /**
   * Générer une clé de métrique
   */
  getMetricKey(metric, tags) {
    if (Object.keys(tags).length === 0) {
      return metric;
    }

    const tagString = Object.keys(tags)
      .sort()
      .map(key => `${key}=${tags[key]}`)
      .join(',');

    return `${metric}{${tagString}}`;
  }

  /**
   * Générer un ID d'événement unique
   */
  generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Exporter les données pour analyse externe
   */
  exportData(format = 'json') {
    const data = {
      metrics: Object.fromEntries(this.metrics),
      events: this.events,
      systemStats: this.getSystemStats(),
      exportedAt: Date.now()
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      default:
        return data;
    }
  }

  /**
   * Convertir les données en CSV
   */
  convertToCSV(data) {
    const events = data.events.map(event => ({
      timestamp: new Date(event.timestamp).toISOString(),
      event: event.event,
      data: JSON.stringify(event.data)
    }));

    const headers = ['timestamp', 'event', 'data'];
    const csvContent = [
      headers.join(','),
      ...events.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    return csvContent;
  }
}

// Instance singleton
const analytics = new AnalyticsManager();

export default analytics;

// Exports pour les fonctions utilitaires
export const {
  track,
  increment,
  timing,
  error,
  trackUser,
  trackTeam,
  trackScore,
  trackTelegramCommand,
  getMetrics,
  getRecentEvents,
  getSystemStats,
  getActivityReport,
  exportData
} = analytics;