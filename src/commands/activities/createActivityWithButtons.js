import { bot } from '../../config/bot.js';
import { Activity } from '../../models/activity.js';
import logger from '../../utils/logger.js';
import { createInlineKeyboard, createButton } from '../../utils/inlineButtons.js';
import { handleError } from '../utils/helpers.js';

/**
 * Commande améliorée pour créer une activité avec interface interactive
 */
export const createActivityWithButtons = async (msg) => {
  try {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Étape 1: Demander le type d'activité
    const activityTypes = [
      [createButton("🎮 Activité de jeu", "create_activity_type_game")],
      [createButton("📚 Activité éducative", "create_activity_type_education")],
      [createButton("🏋️ Activité sportive", "create_activity_type_sport")],
      [createButton("🎨 Activité créative", "create_activity_type_creative")],
      [createButton("➕ Autre type d'activité", "create_activity_type_other")]
    ];
    
    await bot.sendMessage(
      chatId, 
      "🏆 Création d'une nouvelle activité\n\nVeuillez choisir un type d'activité :", 
      createInlineKeyboard(activityTypes)
    );
    
    logger.info(`Utilisateur ${userId} a initié la création d'une activité dans le chat ${chatId}`);
    
  } catch (error) {
    logger.error('Erreur lors de la création d\'activité avec boutons:', error);
    await handleError(msg, error, "Une erreur s'est produite lors de la création de l'activité.");
  }
};

/**
 * Gestionnaire pour les callbacks des boutons de création d'activité
 * @param {Object} query - Objet de requête callback
 * @param {string} action - Action à effectuer
 */
export const handleActivityCreationCallback = async (query, action) => {
  try {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const messageId = query.message.message_id;
    
    // Extraire le type d'activité
    const activityType = action.replace('create_activity_type_', '');
    
    // Confirmer la sélection
    await bot.answerCallbackQuery(query.id, { 
      text: `Type d'activité sélectionné: ${activityType}` 
    });
    
    // Mettre à jour le message avec le type sélectionné
    await bot.editMessageText(
      `🏆 Création d'une activité de type: ${activityType}\n\nVeuillez entrer un nom pour votre activité:`,
      {
        chat_id: chatId,
        message_id: messageId
      }
    );
    
    // Stocker temporairement le type d'activité dans une session utilisateur
    // Note: Vous devrez implémenter un système de gestion d'état utilisateur
    // userSessions.set(userId, { step: 'waiting_activity_name', activityType });
    
    logger.info(`Utilisateur ${userId} a sélectionné le type d'activité ${activityType}`);
    
  } catch (error) {
    logger.error('Erreur lors du traitement du callback de création d\'activité:', error);
    await bot.answerCallbackQuery(query.id, { 
      text: "Une erreur s'est produite. Veuillez réessayer." 
    });
  }
};