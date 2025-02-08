import mongoose from 'mongoose';
const { Schema } = mongoose;

const SubjectSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  code: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: ''
  },
  credits: {
    type: Number,
    default: 0,
    min: 1,
    max: 4
  },
  requiredEquipment: {
    type: [String],
    default: []
  },
  lecturesPerWeek: {
    type: Number,
    default: 3,
    min: 1,
    max: 5
  },
  isActive: {
    type: Boolean,
    default: true
  },
  slotsLeft: {
    type: Number,
    default: function() {
      // Calculate slotsLeft based on credits
      switch (this.credits) {
        case 1:
          return 3;  // 1 credit -> 1-3 lectures per week
        case 2:
          return 5;  // 2 credits -> 4-5 lectures per week
        case 3:
          return 7;  // 3 credits -> 6-7 lectures per week
        case 4:
          return 8;  // 4 credits -> 7-8 lectures per week
        default:
          return 0;
      }
    }
  }
}, {
  timestamps: true
});

export default mongoose.model('Subject', SubjectSchema);
