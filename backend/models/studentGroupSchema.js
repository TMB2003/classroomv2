import mongoose from 'mongoose';
const { Schema } = mongoose;

const StudentGroupSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  grade: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  strength: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  }]
}, {
  timestamps: true
});

// Create a compound index on grade and section
StudentGroupSchema.index({ grade: 1, section: 1 }, { unique: true });

export default mongoose.model('StudentGroup', StudentGroupSchema);