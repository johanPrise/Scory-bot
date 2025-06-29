import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import mongoosePaginate from 'mongoose-paginate-v2';

const userSchema = new mongoose.Schema({
  // Informations d'authentification
  username: {
    type: String,
    required: [true, 'Le nom d\'utilisateur est requis'],
    unique: true,
    trim: true,
    minlength: [3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'],
    maxlength: [30, 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores']
  },
  
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Veuillez entrer un email valide']
  },
  
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
    select: false // Ne pas renvoyer le mot de passe par défaut
  },
  
  // Informations personnelles
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },
  
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  
  avatar: {
    type: String,
    default: ''
  },
  
  // Intégration avec Telegram
  telegram: {
    id: {
      type: String,
      index: true,
      sparse: true
    },
    username: {
      type: String,
      trim: true
    },
    chatId: String,
    linkCode: String, // Code temporaire pour la liaison
    linked: {
      type: Boolean,
      default: false
    }
  },
  
  // Rôles et permissions
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  
  // Références aux équipes
  teams: [{
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    role: {
      type: String,
      enum: ['member', 'admin', 'owner'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Paramètres utilisateur
  settings: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      telegram: {
        type: Boolean,
        default: true
      }
    },
    language: {
      type: String,
      default: 'fr',
      enum: ['fr', 'en', 'es']
    },
    theme: {
      type: String,
      default: 'light',
      enum: ['light', 'dark', 'system']
    }
  },
  
  // Statistiques
  stats: {
    totalScore: {
      type: Number,
      default: 0
    },
    completedActivities: {
      type: Number,
      default: 0
    },
    createdTeams: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  
  // Métadonnées
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active'
  },
  
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  lastLogin: Date,
  lastIp: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index pour les recherches fréquentes
userSchema.index({ 'telegram.id': 1 });
userSchema.index({ 'teams.team': 1 });
userSchema.index({ status: 1 });

// Middleware pour hacher le mot de passe avant la sauvegarde
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour vérifier le mot de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Méthode pour obtenir le nom complet de l'utilisateur
userSchema.methods.getFullName = function() {
  return [this.firstName, this.lastName].filter(Boolean).join(' ') || this.username;
};

// Méthode pour obtenir le nom d'affichage (privilégie le nom Telegram si disponible)
userSchema.methods.getDisplayName = function() {
  if (this.telegram?.username) {
    return `@${this.telegram.username}`;
  }
  return this.getFullName();
};

// Méthode pour vérifier si l'utilisateur est administrateur d'une équipe
userSchema.methods.isTeamAdmin = function(teamId) {
  if (!teamId) return false;
  
  const teamMembership = this.teams.find(t => 
    t.team && t.team.toString() === teamId.toString()
  );
  
  return teamMembership && ['admin', 'owner'].includes(teamMembership.role);
};

// Méthode pour vérifier si l'utilisateur est propriétaire d'une équipe
userSchema.methods.isTeamOwner = function(teamId) {
  if (!teamId) return false;
  
  const teamMembership = this.teams.find(t => 
    t.team && t.team.toString() === teamId.toString()
  );
  
  return teamMembership && teamMembership.role === 'owner';
};

// Méthode pour ajouter l'utilisateur à une équipe
userSchema.methods.addToTeam = function(teamId, role = 'member') {
  // Vérifier si l'utilisateur n'est pas déjà dans l'équipe
  const existingMembership = this.teams.find(t => 
    t.team && t.team.toString() === teamId.toString()
  );
  
  if (existingMembership) {
    existingMembership.role = role;
  } else {
    this.teams.push({
      team: teamId,
      role,
      joinedAt: new Date()
    });
  }
  
  return this.save();
};

// Méthode pour supprimer l'utilisateur d'une équipe
userSchema.methods.removeFromTeam = function(teamId) {
  const initialLength = this.teams.length;
  this.teams = this.teams.filter(t => 
    !t.team || t.team.toString() !== teamId.toString()
  );
  
  // Si aucun changement, ne pas sauvegarder
  if (this.teams.length === initialLength) {
    return Promise.resolve(this);
  }
  
  return this.save();
};

// Méthode pour mettre à jour le score de l'utilisateur
userSchema.methods.updateScore = function(points, activityId) {
  this.stats.totalScore = (this.stats.totalScore || 0) + points;
  this.stats.lastActive = new Date();
  
  if (activityId) {
    this.stats.completedActivities = (this.stats.completedActivities || 0) + 1;
  }
  
  return this.save();
};

// Méthode pour obtenir un résumé du profil public
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName,
    avatar: this.avatar,
    stats: this.stats,
    telegram: this.telegram?.username ? { username: this.telegram.username } : undefined
  };
};

// Ajouter le plugin de pagination
userSchema.plugin(mongoosePaginate);

const User = mongoose.model('User', userSchema);

export default User;
