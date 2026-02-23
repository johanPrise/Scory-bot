import mongoose from 'mongoose';

const chatGroupSchema = new mongoose.Schema({
  // ID du chat Telegram (string car peut être négatif pour les groupes)
  chatId: {
    type: String,
    required: [true, 'L\'ID du chat est requis'],
    unique: true,
    index: true
  },

  // Nom du groupe Telegram
  title: {
    type: String,
    required: [true, 'Le titre du groupe est requis'],
    trim: true,
    maxlength: [256, 'Le titre ne peut pas dépasser 256 caractères']
  },

  // Type de chat Telegram
  type: {
    type: String,
    enum: ['private', 'group', 'supergroup', 'channel'],
    default: 'group'
  },

  // Membres du groupe (utilisateurs ayant interagi avec le bot dans ce groupe)
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    telegramId: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['member', 'admin', 'creator'],
      default: 'member'
    },
    firstSeen: {
      type: Date,
      default: Date.now
    },
    lastSeen: {
      type: Date,
      default: Date.now
    }
  }],

  // Statistiques du groupe
  stats: {
    totalActivities: {
      type: Number,
      default: 0
    },
    totalTeams: {
      type: Number,
      default: 0
    },
    totalScores: {
      type: Number,
      default: 0
    }
  },

  // Le bot est-il toujours actif dans ce groupe ?
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour recherche par membre
chatGroupSchema.index({ 'members.userId': 1 });
chatGroupSchema.index({ 'members.telegramId': 1 });

/**
 * Méthode statique : enregistrer ou mettre à jour un groupe et y ajouter un membre
 * Appelée automatiquement par les commandes du bot
 */
chatGroupSchema.statics.upsertGroup = async function(chatInfo, userInfo) {
  const { chatId, title, type } = chatInfo;
  const { mongoUserId, telegramId } = userInfo;

  let group = await this.findOne({ chatId: chatId.toString() });

  if (group) {
    // Mettre à jour le titre si changé
    if (title && group.title !== title) {
      group.title = title;
    }

    // Ajouter ou mettre à jour le membre
    const memberIdx = group.members.findIndex(
      m => m.userId.toString() === mongoUserId.toString()
    );

    if (memberIdx >= 0) {
      group.members[memberIdx].lastSeen = new Date();
    } else {
      group.members.push({
        userId: mongoUserId,
        telegramId: telegramId.toString(),
        firstSeen: new Date(),
        lastSeen: new Date()
      });
    }

    await group.save();
  } else {
    // Créer le groupe
    group = await this.create({
      chatId: chatId.toString(),
      title: title || `Groupe ${chatId}`,
      type: type || 'group',
      members: [{
        userId: mongoUserId,
        telegramId: telegramId.toString(),
        firstSeen: new Date(),
        lastSeen: new Date()
      }]
    });
  }

  return group;
};

/**
 * Méthode statique : récupérer tous les groupes d'un utilisateur
 */
chatGroupSchema.statics.getUserGroups = async function(mongoUserId) {
  return this.find(
    { 'members.userId': mongoUserId, isActive: true },
    { chatId: 1, title: 1, type: 1, 'members.$': 1, stats: 1, updatedAt: 1 }
  ).sort({ updatedAt: -1 });
};

const ChatGroup = mongoose.model('ChatGroup', chatGroupSchema);

export default ChatGroup;
