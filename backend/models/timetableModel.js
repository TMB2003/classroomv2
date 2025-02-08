import mongoose from 'mongoose';
const { Schema } = mongoose;

const TimeTableSchema = new Schema({
    teacher: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject: {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    studentGroup: {
        type: Schema.Types.ObjectId,
        ref: 'StudentGroup',
        required: true
    },
    day: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Create compound index for unique time slots
TimeTableSchema.index({ teacher: 1, day: 1, startTime: 1 }, { unique: true });
TimeTableSchema.index({ studentGroup: 1, day: 1, startTime: 1 }, { unique: true });

export default mongoose.model('TimeTable', TimeTableSchema);
