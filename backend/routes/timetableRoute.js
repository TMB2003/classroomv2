import express from 'express';
import Timetable from '../models/timetableSchema.js';
import { auth, isAdmin, isTeacher } from '../middleware/auth.js';
import TimetableGenerator from '../services/timetableGenerator.js';
import User from '../models/userSchema.js';
import mongoose from 'mongoose';
import Classroom from '../models/classroomSchema.js';
import { TimetableSlot } from '../models/timetableSlotSchema.js';

const router = express.Router();

router.use(auth);

// Get current timetable
router.get('/timetable', async (req, res) => {
  try {
    // Get the active timetable
    const activeTimetable = await Timetable.findOne({ status: 'active' })
      .sort({ createdAt: -1 })
      .lean();

    if (!activeTimetable) {
      return res.status(404).json({ message: 'No active timetable found' });
    }

    // Get all slots for this timetable
    const slots = await TimetableSlot.find({ timetableId: activeTimetable._id })
      .populate('teacherId', 'name')
      .populate('subjectId', 'name')
      .populate('classroomId', 'name')
      .populate('studentGroupId', 'name')
      .sort({ dayName: 1, timeSlotName: 1 })
      .lean();

    // Group slots by student group
    const groupedSlots = {};

    slots.forEach(slot => {
      const studentGroupId = slot.studentGroupId._id.toString();
      if (!groupedSlots[studentGroupId]) {
        groupedSlots[studentGroupId] = {
          studentGroup: slot.studentGroupId.name,
          schedule: []
        };
      }

      groupedSlots[studentGroupId].schedule.push({
        day: slot.dayName,
        timeSlot: slot.timeSlotName,
        teacher: slot.teacherId.name,
        subject: slot.subjectId.name,
        classroom: slot.classroomId.name
      });
    });

    // Sort schedule for each group
    Object.values(groupedSlots).forEach(group => {
      group.schedule.sort((a, b) => {
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.timeSlot.localeCompare(b.timeSlot);
      });
    });

    res.json({
      timetableId: activeTimetable._id,
      academicYear: activeTimetable.academicYear,
      semester: activeTimetable.semester,
      timetable: Object.values(groupedSlots)
    });
  } catch (error) {
    console.error('Error fetching timetable:', error);
    res.status(500).json({ message: 'Failed to fetch timetable' });
  }
});

// Get teacher's timetable
router.get('/teacher/timetable', auth, async (req, res) => {
  try {
    // Get the active timetable
    const activeTimetable = await Timetable.findOne({ status: 'active' })
      .sort({ createdAt: -1 })
      .lean();

    if (!activeTimetable) {
      return res.status(404).json({ message: 'No active timetable found' });
    }

    // Get all slots for this teacher
    const slots = await TimetableSlot.find({
      timetableId: activeTimetable._id,
      teacherId: new mongoose.Types.ObjectId(req.user.id)
    })
      .populate('subjectId', 'name')
      .populate('classroomId', 'name')
      .populate('studentGroupId', 'name')
      .sort({ dayName: 1, timeSlotName: 1 })
      .lean();

    // Format the slots for frontend
    const formattedSlots = slots.map(slot => ({
      day: slot.dayName,
      startTime: slot.timeSlotName,
      subject: slot.subjectId.name,
      room: slot.classroomId.name,
      studentGroup: slot.studentGroupId.name
    }));

    res.json(formattedSlots);
  } catch (error) {
    console.error('Error fetching teacher timetable:', error);
    res.status(500).json({ message: 'Failed to fetch timetable' });
  }
});

// Get student's schedule
router.get('/student/schedule', auth, async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get student's group
    const student = await User.findById(studentId).populate('metadata.studentGroup');
    if (!student?.metadata?.studentGroup) {
      return res.status(400).json({ message: 'Student not assigned to any group' });
    }

    const studentGroupId = student.metadata.studentGroup._id;

    // Get the active timetable first
    const activeTimetable = await Timetable.findOne({ status: 'active' })
      .sort({ createdAt: -1 })
      .lean();

    if (!activeTimetable) {
      return res.status(404).json({ message: 'No active timetable found' });
    }

    // Get all slots for this student's group
    const slots = await TimetableSlot.find({
      timetableId: activeTimetable._id,
      studentGroupId: studentGroupId
    })
      .populate('teacherId', 'name')
      .populate('subjectId', 'name')
      .populate('classroomId', 'name')
      .sort({ dayName: 1, timeSlotName: 1 })
      .lean();

    // Format the slots for frontend
    const formattedSchedule = slots.map(slot => ({
      day: slot.dayName,
      timeSlot: slot.timeSlotName,
      subject: slot.subjectId.name,
      teacher: slot.teacherId.name,
      room: slot.classroomId.name
    }));

    res.json({
      studentGroup: student.metadata.studentGroup.name,
      schedule: formattedSchedule
    });
  } catch (error) {
    console.error('Error fetching student schedule:', error);
    res.status(500).json({ message: 'Failed to fetch schedule' });
  }
});

// Generate a timetable using group id
router.get('/student-group/timetable/:studentGroupId', auth,isTeacher, async (req, res) => {
  try {
    const { studentGroupId } = req.params; // Extract student group ID from request params

    // Get the active timetable
    const activeTimetable = await Timetable.findOne()
      .sort({ createdAt: -1 })
      .lean();

    if (!activeTimetable) {
      return res.status(404).json({ message: 'No active timetable found' });
    }

    // Get all slots for this student group
    const slots = await TimetableSlot.find({
      timetableId: activeTimetable._id,
      studentGroupId: studentGroupId
    })
      .populate('teacherId', 'name')
      .populate('subjectId', 'name')
      .populate('classroomId', 'name')
      .sort({ dayName: 1, timeSlotName: 1 })
      .lean();

    // Format the slots for frontend
    const formattedSchedule = slots.map(slot => ({
      day: slot.dayName,
      timeSlot: slot.timeSlotName,
      subject: slot.subjectId.name,
      teacher: slot.teacherId.name,
      room: slot.classroomId.name
    }));

    res.json({
      studentGroupId,
      schedule: formattedSchedule
    });
  } catch (error) {
    console.error('Error fetching student group timetable:', error);
    res.status(500).json({ message: 'Failed to fetch timetable' });
  }
});

router.delete("/teacher/class/:id/delete", auth, isTeacher, async (req, res) => {
  try {
      const { day, time, group, subjectId } = req.body;

      if (!day || !time || !group || !subjectId) {
          return res.status(400).json({ error: "Missing required fields" });
      }

      // Find the timetable entry for the given group
      const timetableEntry = await Timetable.findOne({ studentGroup: group });

      if (!timetableEntry) {
          return res.status(404).json({ error: "Timetable entry not found" });
      }

      // Filter out the slot that matches the given day, time, and subject
      const updatedSchedule = timetableEntry.schedule.filter(
          (slot) => !(slot.day === day && slot.timeSlot === time && slot.subject.toString() === subjectId)
      );

      // If no change in schedule, return an error
      if (updatedSchedule.length === timetableEntry.schedule.length) {
          return res.status(404).json({ error: "Slot not found in the schedule" });
      }

      // Update the document in the database
      timetableEntry.schedule = updatedSchedule;
      await timetableEntry.save();

      res.status(200).json({ message: "Slot deleted successfully", timetable: timetableEntry });
  } catch (error) {
      console.error("Error deleting timetable slot:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});


// Generate new timetable (admin only)
router.post('/generate-timetable', isAdmin, async (req, res) => {
  try {
    console.log('Starting timetable generation...');

    // Clear existing timetable and slots
    await Timetable.deleteMany({});
    await TimetableSlot.deleteMany({});

    // Get all required data
    const teachers = await User.find({ role: 'teacher' }).populate('metadata.subjects');
    const classrooms = await Classroom.find();

    if (!teachers.length) {
      return res.status(400).json({ message: 'No teachers found for timetable generation' });
    }
    if (!classrooms.length) {
      return res.status(400).json({ message: 'No classrooms found for timetable generation' });
    }

    // Create a new Timetable document
    const newTimetable = await Timetable.create({
      academicYear: new Date().getFullYear(),
      semester: 1,
      createdAt: new Date(),
      status: 'active'
    });

    // Initialize generator with required data
    const generator = new TimetableGenerator(newTimetable._id);
    generator.teachers = teachers;
    generator.classrooms = classrooms;

    // Generate new timetable
    const timetableSlots = await generator.generateTimetable();

    if (!timetableSlots || timetableSlots.length === 0) {
      await Timetable.deleteOne({ _id: newTimetable._id }); // Clean up if generation failed
      return res.status(400).json({
        message: 'Failed to generate timetable. Please check teacher preferences and subject assignments.'
      });
    }

    // Update timetable with slot references
    newTimetable.slots = timetableSlots.map(slot => slot._id);
    await newTimetable.save();

    // Get all created slots
    const createdSlots = await TimetableSlot.find()
      .populate('teacherId', 'name')
      .populate('subjectId', 'name')
      .populate('classroomId', 'name')
      .populate('studentGroupId', 'name')
      .sort({ dayName: 1, timeSlotName: 1 })
      .lean();

    // Group slots by student group
    const groupedSlots = {};

    createdSlots.forEach(slot => {
      const studentGroupId = slot.studentGroupId._id.toString();
      if (!groupedSlots[studentGroupId]) {
        groupedSlots[studentGroupId] = {
          studentGroup: slot.studentGroupId.name,
          schedule: []
        };
      }

      groupedSlots[studentGroupId].schedule.push({
        day: slot.dayName,
        timeSlot: slot.timeSlotName,
        teacher: slot.teacherId.name,
        subject: slot.subjectId.name,
        classroom: slot.classroomId.name
      });
    });

    // Sort schedule for each group by day and time
    Object.values(groupedSlots).forEach(group => {
      group.schedule.sort((a, b) => {
        const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.timeSlot.localeCompare(b.timeSlot);
      });
    });

    res.json({
      message: 'Timetable generated successfully',
      timetableId: newTimetable._id,
      timetable: Object.values(groupedSlots)
    });
  } catch (error) {
    console.error('Error generating timetable:', error);
    res.status(500).json({
      message: 'Failed to generate timetable',
      error: error.message
    });
  }
});

export default router;
