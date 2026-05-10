import mongoose from 'mongoose';

const botSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  step: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({})
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '24h' // Détruit automatiquement après 24 heures
  }
});

export default mongoose.model('BotSession', botSessionSchema);
