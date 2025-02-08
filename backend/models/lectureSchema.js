import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema({
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  dayOfWeek: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  timeSlot: {
    type: Number,
    required: true,
    min: 0,
    max: 7
  },
  status: {
    type: String,
    enum: ['scheduled', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  cancellationReason: {
    type: String
  }
}, {
  timestamps: true
});

const Lecture = mongoose.model('Lecture', lectureSchema);
export default Lecture;
