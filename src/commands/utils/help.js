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
        '/start — S\'inscrire au bot',
        '/help — Afficher cette aide',
        '/stats — Statistiques globales',
        '/app — Ouvrir l\'App (Mini App Telegram)',
        '/dashboard — Votre tableau de bord personnel',
        '',
        '*🎯 WebApp & Dashboards :*',
        '/admin — Panel administrateur',
        '/scoremanager — Interface visuelle des scores',
        '/teamdashboard — Interface visuelle des équipes',
        '',
        '*🎯 Activités :*',
        '/activities — Lister toutes les activités',
        '/createactivity `nom` `[description]` — Créer',
        '/create\\_activity — Créer (Interactive)',
        '/addsubactivity `parent` `nom [desc]` — Sous-activité',
        '/deleteactivity `nom` — Supprimer',
        '',
        '*🏆 Scores :*',
        '/score `@user` `activité` `points` `[commentaire]` — Ajouter',
        '/subscore `@user` `subactivite` `activité` `points` — Ajouter',
        '/ranking `activité` — Classement général',
        '/subranking `subactivite` `[activité]` — Classement spécifique',
        '/aranking `[activité]` — Classement détaillé/avancé',
        '/shistory `[période]` `[activité]` — Historique des scores',
        '/deletescore `ID` — Supprimer un score',
        '',
        '*👥 Équipes :*',
        '/createteam `nom` `[description]` — Créer',
        '/addtoteam `@user` `équipe` `[admin]` — Ajouter',
        '/teamranking `activité` — Classement par équipe',
        '/deleteteam `nom` — Supprimer l\'équipe',
        '',
        '*🛠 Utilitaires :*',
        '/export — Exporter ses données',
        '/feedback `type` `message` — Signaler un problème',
      );
    } else if (isGroup) {
      const safeBotUsername = (msg.botUsername || 'scory_fr_bot').replace(/_/g, '\\_');
      
      // -- AIDE GROUPE --
      sections.push(
        '👥 _Vous êtes dans un groupe._',
        '_Dans les groupes, ajoutez @' + safeBotUsername + ' après la commande._',
        '',
        '*Exemple :* `/ranking@scory_fr_bot course`',
        '',
        '*📋 Commandes disponibles en groupe :*',
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
        '*💬 Commandes conseillées en privé :*',
        '`/start` — S\'inscrire',
        '`/help` — Aide détaillée',
        '`/shistory` — Historique personnel',
        '`/createteam` — Créer une équipe',
        '`/app` — Découvrir la Mini App !',
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
