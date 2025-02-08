import mongoose from 'mongoose';

const timetableSlotSchema = new mongoose.Schema({
    day: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
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
    studentGroup: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudentGroup',
        required: true
    },
    timetable: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Timetable',
        required: true
    }
}, {
    timestamps: true
});

const TimetableSlot = mongoose.model('TimetableSlot', timetableSlotSchema);

export default TimetableSlot;
