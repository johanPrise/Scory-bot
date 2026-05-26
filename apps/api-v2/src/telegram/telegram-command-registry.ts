import { Injectable } from '@nestjs/common';

export type TelegramCommandSpec = {
  command: string;
  description: string;
  status: 'implemented' | 'planned';
};

@Injectable()
export class TelegramCommandRegistry {
  readonly commands: TelegramCommandSpec[] = [
    { command: 'start', description: 'Demarrer le bot', status: 'implemented' },
    { command: 'help', description: 'Afficher aide et commandes', status: 'implemented' },
    { command: 'activities', description: 'Lister les activites', status: 'implemented' },
    { command: 'createactivity', description: 'Creer une activite', status: 'implemented' },
    { command: 'addsubactivity', description: 'Ajouter une sous-activite', status: 'implemented' },
    { command: 'history', description: 'Historique des activites', status: 'implemented' },
    { command: 'score', description: 'Enregistrer un score', status: 'implemented' },
    { command: 'ranking', description: 'Voir le classement', status: 'implemented' },
    { command: 'stats', description: 'Statistiques activite', status: 'implemented' },
    { command: 'createteam', description: 'Creer une equipe', status: 'implemented' },
    { command: 'addtoteam', description: 'Ajouter un membre', status: 'implemented' },
    { command: 'teamranking', description: 'Classement equipe', status: 'implemented' },
    { command: 'deleteactivity', description: 'Supprimer une activite', status: 'implemented' },
    { command: 'deleteteam', description: 'Supprimer une equipe', status: 'implemented' },
    { command: 'deletescore', description: 'Supprimer un score', status: 'implemented' },
    { command: 'app', description: 'Ouvrir la WebApp', status: 'implemented' },
  ];
}
