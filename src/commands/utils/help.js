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
      '❓ *Aide — Commandes Scory*',
      '',
    ];

    if (isPrivate) {
      // -- AIDE INBOX --
      sections.push(
        '💬 _Vous êtes en conversation privée._',
        '_Toutes les commandes fonctionnent ici sans @mention._',
        '',
        '*🏠 Commandes de base :*',
        '/start — Démarrer / s\'inscrire',
        '/help — Cette aide',
        '/stats — Statistiques globales',
        '/app — Ouvrir la Mini App',
        '/dashboard — Tableau de bord',
        '',
        '*🎯 Activités :*',
        '/activities — Lister les activités',
        '/createactivity `nom` `[description]` — Créer une activité',
        '/create\\_activity — Créer (mode interactif)',
        '/addsubactivity `parent` `nom [desc]` — Sous-activité',
        '/history `[nombre]` `[période]` — Historique',
        '',
        '*🏆 Scores :*',
        '/score `@user` `activité` `points` `[commentaire]`',
        '/ranking `activité` — Classement',
        '',
        '*👥 Équipes :*',
        '/createteam `nom` `[description]` — Créer une équipe',
        '/addtoteam `@user` `équipe` `[admin]` — Ajouter un membre',
        '/teamranking `activité` — Classement d\'équipe',
      );
    } else if (isGroup) {
      // -- AIDE GROUPE --
      sections.push(
        '👥 _Vous êtes dans un groupe._',
        '_Dans les groupes, ajoutez @' + (msg.botUsername || 'scory\\_fr\\_bot') + ' après la commande._',
        '',
        '*Exemple :* `/ranking@scory_fr_bot course`',
        '',
        '*📋 Commandes disponibles en groupe :*',
        '/score — Enregistrer un score',
        '/ranking — Voir le classement',
        '/stats — Statistiques',
        '/activities — Lister les activités',
        '/createactivity — Créer une activité',
        '/addtoteam — Ajouter à une équipe',
        '/teamranking — Classement équipe',
        '',
        '*💬 Commandes conseillées en privé :*',
        '`/start` — Inscription',
        '`/help` — Aide détaillée',
        '`/history` — Historique personnel',
        '`/createteam` — Créer une équipe',
        '`/app` — Mini App',
        '',
        '_💡 Pour une aide complète, envoyez /help en message privé au bot._',
      );
    }

    sections.push(
      '',
      `_${TELEGRAM_CONFIG.COMMANDS.length} commandes disponibles_`,
    );

    await bot.sendMessage(chatId, sections.join('\n'), { parse_mode: 'Markdown' });

    logger.info(`/help (${chatType}) par ${msg.from.id}`);
  } catch (error) {
    logger.error('Erreur /help:', error);
    await bot.sendMessage(chatId, '❌ Erreur lors de l\'affichage de l\'aide.').catch(() => {});
  }
};

export default help;
