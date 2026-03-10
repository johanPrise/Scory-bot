import { bot } from '../../config/bot.js';
import { TELEGRAM_CONFIG } from '../../config/telegram.js';
import logger from '../../utils/logger.js';

/**
 * Commande /help - Affiche l'aide contextuelle (group vs inbox)
 */
const help = async (msg) => {
  const chatId = msg.chat.id;
  const chatType = msg.chat.type;
  const isPrivate = chatType === 'private';
  const isGroup = ['group', 'supergroup'].includes(chatType);

  try {
    const sections = [
      '❓ <b>Aide — Commandes Scory</b>',
      '',
    ];

    if (isPrivate) {
      // -- AIDE INBOX --
      sections.push(
        '💬 <i>Vous êtes en conversation privée.</i>',
        '<i>Toutes les commandes fonctionnent ici sans @mention.</i>',
        '',
        '<b>🏠 Commandes de base :</b>',
        '/start — S\'inscrire au bot',
        '/help — Afficher cette aide',
        '/stats — Statistiques globales',
        '/app — Ouvrir l\'App (Mini App Telegram)',
        '',
        '<b>🎯 Activités :</b>',
        '/activities — Lister toutes les activités',
        '/createactivity <code>nom</code> <code>[description]</code> — Créer',
        '/create_activity — Créer (Interactive)',
        '/addsubactivity <code>parent</code> <code>nom [desc]</code> — Sous-activité',
        '/deleteactivity <code>nom</code> — Supprimer',
        '',
        '<b>🏆 Scores :</b>',
        '/score <code>@user</code> <code>activité</code> <code>points</code> <code>[commentaire]</code> — Ajouter',
        '/subscore <code>@user</code> <code>subactivite</code> <code>activité</code> <code>points</code> — Ajouter',
        '/ranking <code>activité</code> — Classement général',
        '/subranking <code>subactivite</code> <code>[activité]</code> — Classement spécifique',
        '/aranking <code>[activité]</code> — Classement détaillé/avancé',
        '/shistory <code>[période]</code> <code>[activité]</code> — Historique des scores',
        '/deletescore <code>ID</code> — Supprimer un score',
        '',
        '<b>👥 Équipes :</b>',
        '/createteam <code>nom</code> <code>[description]</code> — Créer',
        '/addtoteam <code>@user</code> <code>équipe</code> <code>[admin]</code> — Ajouter',
        '/teamranking <code>activité</code> — Classement par équipe',
        '/deleteteam <code>nom</code> — Supprimer l\'équipe',
      );
    } else if (isGroup) {
      const botName = msg.botUsername || 'scory_fr_bot';
      
      // -- AIDE GROUPE --
      sections.push(
        '👥 <i>Vous êtes dans un groupe.</i>',
        `<i>Dans les groupes, ajoutez @${botName} après la commande.</i>`,
        '',
        `<b>Exemple :</b> <code>/ranking@${botName} course</code>`,
        '',
        '<b>📋 Commandes disponibles en groupe :</b>',
        '/score — Enregistrer un score',
        '/subscore — Enregistrer un sous-score',
        '/ranking — Voir le classement normal',
        '/aranking — Voir le classement avancé',
        '/stats — Statistiques',
        '/activities — Lister les activités',
        '/createactivity — Créer une activité',
        '/addtoteam — Ajouter à une équipe',
        '/teamranking — Classement par équipe',
        '',
        '<b>💬 Commandes conseillées en privé :</b>',
        '<code>/start</code> — S\'inscrire',
        '<code>/help</code> — Aide détaillée',
        '<code>/shistory</code> — Historique personnel',
        '<code>/createteam</code> — Créer une équipe',
        '<code>/app</code> — Découvrir la Mini App !',
        '',
        '<i>💡 Pour une aide complète, envoyez /help en message privé au bot.</i>',
      );
    }

    sections.push(
      '',
      `<i>${TELEGRAM_CONFIG.COMMANDS.length} commandes disponibles</i>`,
    );

    await bot.sendMessage(chatId, sections.join('\n'), { parse_mode: 'HTML' });

    logger.info(`/help (${chatType}) par ${msg.from.id}`);
  } catch (error) {
    logger.error('Erreur /help:', error);
    await bot.sendMessage(chatId, '❌ Erreur lors de l\'affichage de l\'aide.').catch(() => {});
  }
};

export default help;
