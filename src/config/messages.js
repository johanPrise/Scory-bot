/**
 * Messages de l'application
 * Centralise tous les messages utilisés dans l'application
 */

// Émojis utilisés dans l'application
export const EMOJIS = {
  CHECK: '✅',
  CROSS: '❌',
  INFO: 'ℹ️',
  LOCK: '🔒',
  WARNING: '⚠️',
  CLOCK: '⏳',
  ROBOT: '🤖',
  KEY: '🔑',
  CHART: '📊',
  TEAM: '👥',
  TROPHY: '🏆',
  QUESTION: '❓',
  LINK: '🔗',
  USER: '👤',
  GEAR: '⚙️',
  CALENDAR: '📅',
  GRAPH: '📈',
  MEDAL: '🏅',
  TADA: '🎉',
  ROCKET: '🚀'
};

export const MESSAGES = {
  // Messages d'authentification
  WELCOME: '👋 Bienvenue sur Scory Bot !\n\n' +
    'Je suis votre assistant pour gérer les scores et activités de votre équipe.\n\n' +
    'Pour commencer, utilisez la commande /link suivi de votre email pour lier votre compte.\n' +
    'Exemple: /link votre@email.com',
  
  ACCOUNT_LINKED: '✅ Votre compte a été lié avec succès !',
  ACCOUNT_ALREADY_LINKED: 'ℹ️ Votre compte est déjà lié.',
  INVALID_EMAIL: '❌ Veuillez fournir une adresse email valide.',
  LINK_EXPIRED: '❌ Le lien de vérification a expiré. Veuillez réessayer.',
  INVALID_LINK: '❌ Lien de vérification invalide.',
  AUTH_ERROR: '❌ Une erreur est survenue. Veuillez réessayer plus tard.',
  
  // Messages d'activités
  ACTIVITY_CREATED: '✅ Activité créée avec succès !',
  ACTIVITY_UPDATED: '✅ Activité mise à jour avec succès !',
  ACTIVITY_DELETED: '✅ Activité supprimée avec succès !',
  ACTIVITY_NOT_FOUND: '❌ Activité non trouvée.',
  INVALID_ACTIVITY_INPUT: '❌ Données d\'activité invalides.',
  
  // Messages d'équipes
  TEAM_CREATED: '✅ Équipe créée avec succès !',
  TEAM_UPDATED: '✅ Équipe mise à jour avec succès !',
  TEAM_DELETED: '✅ Équipe supprimée avec succès !',
  TEAM_NOT_FOUND: '❌ Équipe non trouvée.',
  MEMBER_ADDED: '✅ Membre ajouté à l\'équipe !',
  MEMBER_REMOVED: '✅ Membre retiré de l\'équipe !',
  MEMBER_NOT_FOUND: '❌ Membre non trouvé dans l\'équipe.',
  
  // Messages de scores
  SCORE_ADDED: '✅ Score ajouté avec succès !',
  SCORE_UPDATED: '✅ Score mis à jour avec succès !',
  SCORE_DELETED: '✅ Score supprimé avec succès !',
  SCORE_NOT_FOUND: '❌ Score non trouvé.',
  INVALID_SCORE: '❌ Valeur de score invalide.',
  
  // Messages d'erreur
  UNAUTHORIZED: '🔒 Vous n\'êtes pas autorisé à effectuer cette action.',
  NOT_FOUND: '❌ La ressource demandée est introuvable.',
  SERVER_ERROR: '⚠️ Une erreur inattendue s\'est produite. Veuillez réessayer plus tard.',
  VALIDATION_ERROR: '❌ Erreur de validation. Veuillez vérifier vos données.',
  RATE_LIMIT: '⏳ Trop de requêtes. Veuillez patienter avant de réessayer.',
  
  // Message d'aide
  HELP: `
🤖 *Commandes du Scory Bot* \- Voici ce que vous pouvez faire :\n\n
*🔐 Authentification*\n
/link <email> \- Lier votre compte avec votre email\n\n
*📊 Activités*\n
/createactivity <nom> \- Créer une nouvelle activité\n/addsubactivity <activité> <sous-activité> \- Ajouter une sous-activité\n/activities \- Lister toutes les activités\n/history \- Voir votre historique d'activités\n\n
*👥 Équipes*\n
/createteam <nom> <description> \- Créer une nouvelle équipe\n/addtoteam <équipe> <utilisateur> <rôle> \- Ajouter un utilisateur à une équipe\n/teamranking <équipe> \- Voir le classement d'une équipe\n\n
*🏆 Scores*\n
/addscore <activité> <score> \- Ajouter un score pour une activité\n/addsubscore <activité> <sous-activité> <score> \- Ajouter un score pour une sous-activité\n/ranking \- Voir le classement\n\n
*❓ Aide*\n
/help \- Afficher ce message d'aide\n\n
*🔗 Application Web*\n
Utilisez l'application web pour une meilleure expérience : [Ouvrir l'application](${process.env.FRONTEND_URL || 'https://yourapp.com'})\n`
};

export default MESSAGES;
