import { bot } from '../../config/bot.js';

// Fonction utilitaire pour gérer les erreurs
export const handleError = (chatId, error) => {
  console.error('Error:', error);
  bot.sendMessage(chatId, "Une erreur s'est produite. Veuillez réessayer plus tard.");
};

// Fonction utilitaire pour valider les paramètres
export const validateParams = (chatId, params, expectedCount) => {
  if (params.length !== expectedCount) {
    bot.sendMessage(chatId, `Nombre de paramètres incorrect. Attendu : ${expectedCount}`);
    return false;
  }
  return true;
};

// Fonction pour formater une date au format lisible
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
