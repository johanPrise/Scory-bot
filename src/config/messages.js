/**
 * Messages et constantes pour le bot Telegram
 */

export const MESSAGES = {
  WELCOME: `👋 Bienvenue sur Scory Bot !

Je vais vous aider à gérer les scores et compétitions de votre groupe.

Pour commencer, utilisez la commande /link pour lier votre compte Telegram à votre compte Scory.

Utilisez /help pour voir toutes les commandes disponibles.`,

  HELP: `📚 *Aide - Commandes disponibles* 📚

*Commandes principales :*
/start - Démarrer le bot et voir les instructions
/help - Afficher ce message d'aide
/link [code] - Lier votre compte Telegram à votre compte Scory`,

  LINK: {
    INSTRUCTIONS: `🔗 Pour lier votre compte, utilisez la commande comme ceci :
/link VOTRE_CODE_DE_LIEN

Vous pouvez obtenir ce code dans les paramètres de votre compte sur le site web.`,
    SUCCESS: '✅ Compte lié avec succès !\nVous pouvez maintenant utiliser toutes les fonctionnalités du bot.',
    ERROR: '❌ Impossible de lier le compte. Veuillez vérifier le code et réessayer.\n\nSi le problème persiste, contactez le support.'
  },

  ERRORS: {
    GENERAL: '❌ Une erreur est survenue. Veuillez réessayer plus tard.',
    UNAUTHORIZED: '🔒 Vous devez être connecté pour effectuer cette action.',
    NOT_FOUND: '🔍 Ressource introuvable.',
    INVALID_INPUT: '⚠️ Données invalides. Veuillez vérifier vos entrées.'
  }
};

export const COMMANDS = [
  { command: 'start', description: 'Démarrer le bot' },
  { command: 'help', description: 'Afficher l\'aide' },
  { command: 'link', description: 'Lier votre compte' },
  { command: 'createactivity', description: 'Créer une nouvelle activité' },
  { command: 'activities', description: 'Lister les activités' }
];

export const MENU_BUTTONS = {
  MAIN: [
    ['📊 Voir activités', '👥 Mes groupes'],
    ['🏆 Classements', '⚙️ Paramètres']
  ],
  ACTIVITIES: [
    ['➕ Créer activité', '📋 Mes activités'],
    ['🔙 Retour']
  ]
};

export const EMOJIS = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOCK: '🔒',
  MAGNIFY: '🔍',
  TROPHY: '🏆',
  GEAR: '⚙️',
  CHART: '📊',
  PEOPLE: '👥',
  PLUS: '➕',
  LIST: '📋',
  BACK: '🔙',
  LINK: '🔗',
  BOOK: '📚'
};
