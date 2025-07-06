/**
 * Gestionnaire d'erreurs centralisé
 * @param {Error} error - L'erreur à gérer
 * @param {Object} ctx - Le contexte du bot
 */
export const handleError = (error, ctx) => {
  console.error('Erreur dans la commande:', error);
  const errorMessage = error.message || 'Une erreur est survenue. Veuillez réessayer plus tard.';
  
  if (ctx && ctx.reply) {
    return ctx.reply(`❌ ${errorMessage}`);
  }
  
  return errorMessage;
};

/**
 * Valide les paramètres d'une commande
 * @param {Array} params - Les paramètres à valider
 * @param {Object} rules - Les règles de validation
 * @returns {Object} { isValid: boolean, message: string }
 */
export const validateParams = (params, rules) => {
  if (!rules) return { isValid: true };
  
  // Vérification du nombre de paramètres
  if (rules.required && rules.required > 0) {
    if (!params || params.length < rules.required) {
      return {
        isValid: false,
        message: `Cette commande nécessite au moins ${rules.required} paramètre(s).`
      };
    }
  }
  
  // Vérification du type des paramètres
  if (rules.types) {
    for (let i = 0; i < Math.min(params.length, rules.types.length); i++) {
      const param = params[i];
      const type = rules.types[i];
      
      if (type === 'number' && isNaN(Number(param))) {
        return {
          isValid: false,
          message: `Le paramètre ${i + 1} doit être un nombre.`
        };
      }
      // Ajoutez d'autres vérifications de type si nécessaire
    }
  }
  
  return { isValid: true };
};

// Autres fonctions utilitaires
export const helpers = {
  /**
   * Formate un message d'aide
   */
  formatHelpMessage(commands) {
    let message = "📋 *Commandes disponibles* :\n\n";
    
    commands.forEach(cmd => {
      message += `🔹 */${cmd.command}* - ${cmd.description}\n`;
      if (cmd.usage) {
        message += `   _Utilisation_ : \`${cmd.usage}\`\n`;
      }
      message += "\n";
    });

    return message;
  },

  /**
   * Vérifie si un utilisateur est administrateur
   */
  isAdmin(user) {
    return user && (user.role === 'admin' || user.role === 'superadmin');
  },

  /**
   * Formate une date pour l'affichage
   */
  formatDate(date) {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

export default helpers;
