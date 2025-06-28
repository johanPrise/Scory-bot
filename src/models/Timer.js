import mongoose from 'mongoose';

const timerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', index: true },
  duration: { type: Number, required: true }, // in minutes
  startedAt: { type: Date, required: true },
  endTime: { type: Date, required: true },
  running: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Timer', timerSchema);
