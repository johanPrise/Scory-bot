/**
 * Commande /help - Affiche l'aide et la liste des commandes disponibles
 * @param {Object} msg - L'objet message de Telegram
 */
const help = async (msg) => {
  const chatId = msg.chat.id;
  
  const helpMessage = `
🤖 *Commandes disponibles* :\n\n` +
    `*Authentification* :\n` +
    `/start - Démarrer le bot\n` +
    `/link [code] - Lier votre compte Telegram\n\n` +
    `*Scores* :\n` +
    `/score [points] - Ajouter des points\n` +
    `/scores - Voir les scores actuels\n\n` +
    `*Aide* :\n` +
    `/help - Afficher ce message\n\n` +
    `Pour plus d'informations, visitez notre site web.`;

  try {
    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Erreur dans la commande /help:', error);
  }
};

export default help;
