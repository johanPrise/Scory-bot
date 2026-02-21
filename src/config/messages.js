/**
 * Messages et emojis centralisés pour le bot Telegram
 */

export const EMOJIS = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  HELP: '❓',
  STAR: '⭐',
  TROPHY: '🏆',
  CHART: '📊',
  TEAM: '👥',
  USER: '👤',
  SETTINGS: '⚙️',
  LINK: '🔗',
  REFRESH: '🔄',
  CLOCK: '⏰',
  FIRE: '🔥',
  MEDAL: '🥇',
  PENCIL: '✏️',
  TRASH: '🗑️',
  CHECK: '☑️',
  CROSS: '✖️',
  ARROW_RIGHT: '➡️',
  ARROW_LEFT: '⬅️',
  BACK: '🔙',
  NEW: '🆕',
  ROCKET: '🚀',
};

export const MESSAGES = {
  // Messages généraux
  WELCOME: `${EMOJIS.ROCKET} *Bienvenue sur Scory Bot !*\n\nJe suis votre assistant pour gérer les scores et les activités.\n\nUtilisez /help pour voir toutes les commandes disponibles.`,
  
  HELP: {
    HEADER: `${EMOJIS.HELP} *Aide - Commandes disponibles*\n`,
    FOOTER: '\n💡 Utilisez /help <commande> pour plus de détails sur une commande spécifique.'
  },

  // Messages d'authentification
  AUTH: {
    ACCOUNT_CREATED: `${EMOJIS.SUCCESS} *Profil créé automatiquement !*`,
    WELCOME_BACK: `${EMOJIS.SUCCESS} Content de vous revoir !`
  },

  // Messages d'activités
  ACTIVITY: {
    CREATED: `${EMOJIS.SUCCESS} Activité créée avec succès !`,
    NOT_FOUND: `${EMOJIS.ERROR} Activité non trouvée.`,
    LIST_EMPTY: `${EMOJIS.INFO} Aucune activité trouvée.`,
    LIST_HEADER: `${EMOJIS.CHART} *Vos activités :*\n`,
  },

  // Messages de scores
  SCORE: {
    ADDED: `${EMOJIS.SUCCESS} Score enregistré avec succès !`,
    ERROR: `${EMOJIS.ERROR} Erreur lors de l'enregistrement du score.`,
    RANKING_HEADER: `${EMOJIS.TROPHY} *Classement*\n`,
    NO_SCORES: `${EMOJIS.INFO} Aucun score enregistré pour le moment.`,
  },

  // Messages d'équipes
  TEAM: {
    CREATED: `${EMOJIS.SUCCESS} Équipe créée avec succès !`,
    NOT_FOUND: `${EMOJIS.ERROR} Équipe non trouvée.`,
    MEMBER_ADDED: `${EMOJIS.SUCCESS} Membre ajouté à l'équipe.`,
    ALREADY_MEMBER: `${EMOJIS.WARNING} Cet utilisateur est déjà membre de l'équipe.`,
  },

  // Messages d'erreurs génériques
  ERRORS: {
    GENERIC: `${EMOJIS.ERROR} Une erreur est survenue. Veuillez réessayer.`,
    NOT_AUTHORIZED: `${EMOJIS.ERROR} Vous n'avez pas les permissions nécessaires.`,
    NOT_FOUND: `${EMOJIS.WARNING} Profil introuvable. Utilisez /start pour créer votre profil.`,
    INVALID_PARAMS: `${EMOJIS.ERROR} Paramètres invalides. Utilisez /help pour voir l'utilisation correcte.`,
    RATE_LIMITED: `${EMOJIS.WARNING} Trop de requêtes. Veuillez patienter un instant.`,
  }
};

export default { MESSAGES, EMOJIS };
