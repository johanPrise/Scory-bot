import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const subActivitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom de la sous-activité est requis'],
    trim: true,
    minlength: [2, 'Le nom de la sous-activité doit contenir au moins 2 caractères']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La description ne peut pas dépasser 500 caractères']
  },
  maxScore: {
    type: Number,
    default: 100,
    min: 1,
    max: 1000
  },
  scores: {
    type: Map,
    of: {
      score: {
        type: Number,
        required: true,
        min: 0
      },
      awardedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      awardedAt: {
        type: Date,
        default: Date.now
      },
      comments: {
        type: String,
        trim: true,
        maxlength: [500, 'Le commentaire ne peut pas dépasser 500 caractères']
      }
    },
    default: new Map()
  },
  teamScores: {
    type: Map,
    of: {
      score: {
        type: Number,
        required: true,
        min: 0
      },
      awardedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      awardedAt: {
        type: Date,
        default: Date.now
      },
      comments: {
        type: String,
        trim: true
      }
    },
    default: new Map()
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const activitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom de l\'activité est requis'],
    trim: true,
    minlength: [2, 'Le nom de l\'activité doit contenir au moins 2 caractères'],
    maxlength: [100, 'Le nom de l\'activité ne peut pas dépasser 100 caractères']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères']
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
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    index: true
  },
  subActivities: [subActivitySchema],
  settings: {
    isActive: {
      type: Boolean,
      default: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurrencePattern: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', null],
      default: null
    },
    maxParticipants: {
      type: Number,
      min: 1,
      default: 50
    }
  },
  stats: {
    totalParticipants: {
      type: Number,
      default: 0
    },
    totalSubmissions: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    lastSubmission: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Ajouter le plugin de pagination
activitySchema.plugin(mongoosePaginate);

export const Activity = mongoose.model('Activity', activitySchema);