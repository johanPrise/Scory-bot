import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom de l\'équipe est requis'],
    trim: true,
    minlength: [2, 'Le nom de l\'équipe doit contenir au moins 2 caractères'],
    maxlength: [50, 'Le nom de l\'équipe ne peut pas dépasser 50 caractères']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  chatId: {
    type: String,
    required: [true, 'L\'ID du chat est requis'],
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur créateur est requis']
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true,
      trim: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isAdmin: {
      type: Boolean,
      default: false
    }
  }],
  activities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity'
  }],
  settings: {
    maxMembers: {
      type: Number,
      default: 10,
      min: 1,
      max: 100
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    joinCode: {
      type: String,
      unique: true,
      sparse: true
    }
  },
  stats: {
    totalScore: {
      type: Number,
      default: 0
    },
    completedActivities: {
      type: Number,
      default: 0
    },
    lastActivity: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index composé pour s'assurer que le nom de l'équipe est unique par chat
teamSchema.index({ name: 1, chatId: 1 }, { unique: true });

// Index pour les recherches fréquentes
teamSchema.index({ chatId: 1, 'members.userId': 1 });

// Méthode pour ajouter un membre à l'équipe
teamSchema.methods.addMember = function(userId, username, isAdmin = false) {
  // Vérifier si l'utilisateur n'est pas déjà membre
  const isMember = this.members.some(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (isMember) {
    throw new Error('Cet utilisateur est déjà membre de l\'équipe');
  }

  // Vérifier la limite de membres
  if (this.members.length >= this.settings.maxMembers) {
    throw new Error('Le nombre maximum de membres a été atteint');
  }

  this.members.push({
    userId,
    username,
    isAdmin,
    joinedAt: new Date()
  });

  return this.save();
};

// Méthode pour supprimer un membre de l'équipe
teamSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (memberIndex === -1) {
    throw new Error('Membre non trouvé dans l\'équipe');
  }

  this.members.splice(memberIndex, 1);
  return this.save();
};

// Méthode pour mettre à jour le score de l'équipe
teamSchema.methods.updateScore = function(points) {
  this.stats.totalScore += points;
  this.stats.lastActivity = new Date();
  return this.save();
};

// Middleware pour générer un code d'invitation avant la sauvegarde
teamSchema.pre('save', async function(next) {
  if (this.settings.isPrivate && !this.settings.joinCode) {
    // Générer un code alphanumérique de 8 caractères
    this.settings.joinCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  next();
});

// Ajouter le plugin de pagination
teamSchema.plugin(mongoosePaginate);

const Team = mongoose.model('Team', teamSchema);

export default Team;
