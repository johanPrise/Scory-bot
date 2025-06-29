import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const scoreSchema = new mongoose.Schema({
  // Référence à l'utilisateur qui a obtenu le score
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Référence à l'équipe (optionnelle)
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    index: true
  },
  
  // Référence à l'activité principale
  activity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: [true, 'L\'activité est requise'],
    index: true
  },
  
  // Référence à la sous-activité (optionnelle)
  subActivity: {
    type: String,
    trim: true
  },
  
  // Données du score
  value: {
    type: Number,
    required: [true, 'La valeur du score est requise'],
    min: [0, 'Le score ne peut pas être négatif']
  },
  
  // Score maximum possible pour normalisation
  maxPossible: {
    type: Number,
    required: [true, 'Le score maximum possible est requis'],
    min: [1, 'Le score maximum doit être supérieur à 0']
  },
  
  // Score normalisé (0-100)
  normalizedScore: {
    type: Number,
    min: 0,
    max: 100,
    default: function() {
      return Math.min(100, Math.round((this.value / this.maxPossible) * 100));
    }
  },
  
  // Métadonnées
  awardedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'L\'utilisateur qui a attribué le score est requis']
  },
  
  // Contexte du score
  context: {
    type: String,
    enum: ['individual', 'team', 'group'],
    required: [true, 'Le contexte du score est requis']
  },
  
  // Données supplémentaires
  metadata: {
    chatId: {
      type: String,
      required: [true, 'L\'ID du chat est requis'],
      index: true
    },
    messageId: String,
    comments: {
      type: String,
      trim: true,
      maxlength: [500, 'Le commentaire ne peut pas dépasser 500 caractères']
    },
    evidence: String // URL vers une preuve (image, lien, etc.)
  },
  
  // Validité du score
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'disputed'],
    default: 'approved'
  },
  
  // Raison du rejet (si applicable)
  rejectionReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index composé pour les recherches fréquentes
scoreSchema.index({ user: 1, activity: 1, subActivity: 1 }, { unique: true });
scoreSchema.index({ team: 1, activity: 1, subActivity: 1 }, { unique: true, sparse: true });
scoreSchema.index({ 'metadata.chatId': 1, createdAt: -1 });

// Middleware pour calculer le score normalisé avant la sauvegarde
scoreSchema.pre('save', function(next) {
  if (this.isModified('value') || this.isModified('maxPossible')) {
    this.normalizedScore = Math.min(100, Math.round((this.value / this.maxPossible) * 100));
  }
  next();
});

// Méthode pour vérifier si le score est valide
scoreSchema.methods.isValid = function() {
  return this.status === 'approved';
};

// Méthode pour rejeter un score
scoreSchema.methods.reject = function(reason) {
  this.status = 'rejected';
  this.rejectionReason = reason;
  return this.save();
};

// Méthode pour approuver un score
scoreSchema.methods.approve = function() {
  this.status = 'approved';
  this.rejectionReason = undefined;
  return this.save();
};

// Méthode statique pour obtenir le classement
scoreSchema.statics.getRanking = async function({ activityId, subActivity, limit = 10, teamId }) {
  const match = { activity: activityId, status: 'approved' };
  
  if (subActivity) {
    match.subActivity = subActivity;
  }
  
  if (teamId) {
    match.team = teamId;
  } else {
    match.team = { $exists: false }; // Seulement les scores individuels
  }
  
  return this.aggregate([
    { $match: match },
    { $sort: { normalizedScore: -1, createdAt: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: '$userInfo' },
    {
      $project: {
        _id: 0,
        userId: '$user',
        username: '$userInfo.username',
        firstName: '$userInfo.firstName',
        lastName: '$userInfo.lastName',
        score: '$value',
        maxPossible: 1,
        normalizedScore: 1,
        createdAt: 1
      }
    }
  ]);
};

// Ajouter le plugin de pagination
scoreSchema.plugin(mongoosePaginate);

const Score = mongoose.model('Score', scoreSchema);

export default Score;
