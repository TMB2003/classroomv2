import express from 'express';
const router = express.Router();
import { auth, isTeacher } from '../middleware/auth.js';
import Batch from '../models/batchSchema.js';
import Lecture from '../models/lectureSchema.js';
import Notification from '../models/notificationSchema.js';
import User from '../models/userSchema.js';
import StudentGroup from '../models/studentGroupSchema.js';
// @desc    Get all batches for a teacher
// @route   GET /api/activity/batches
// @access  Private (Teachers only)
router.get('/batches', async (req, res) => {
  try {
      // Get the teacher's user ID from the request (assuming it's passed via a JWT or session)
      const teacherId = req.user._id;

      // Find the teacher's user by their ID and get their subjects
      const teacher = await User.findById(teacherId).populate('metadata.subjects');
      
      if (!teacher) {
          return res.status(404).json({ message: 'Teacher not found' });
      }

      const teacherSubjects = teacher.metadata.subjects.map(subject => subject._id);

      // Find student groups where any subject matches the teacher's subjects
      const studentGroups = await StudentGroup.find({
          subjects: { $in: teacherSubjects } // Match subjects in student group with teacher's subjects
      }).populate('subjects'); // Optionally populate subjects if you want more details

      // For each student group, count how many students belong to that group
      const groupsWithStudentCount = await Promise.all(studentGroups.map(async (group) => {
          const studentCount = await User.countDocuments({
              'metadata.studentGroup': group._id,
              'role': 'student' // Ensure we're only counting students
          });
          return {
              ...group.toObject(),
              studentCount
          };
      }));

      if (groupsWithStudentCount.length === 0) {
          return res.status(404).json({ message: 'No student groups found for the teacher' });
      }

      // Return the student groups along with the student count
      res.status(200).json(groupsWithStudentCount);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Get batch timetable
// @route   GET /api/activity/batch/:batchId/timetable
// @access  Private (Teachers only)
router.get('/batch/:batchId/timetable', auth, isTeacher, async (req, res) => {
  try {
    const { batchId } = req.params;

    // Check if batch exists and teacher has access
    const batch = await Batch.findOne({
      _id: batchId,
      teachers: req.user._id
    });

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found or access denied' });
    }

    // Get all lectures for the batch
    const lectures = await Lecture.find({ batch: batchId })
      .populate('teacher', 'name')
      .populate('subject', 'name')
      .sort({ dayOfWeek: 1, startTime: 1 });

    // Format timetable data
    const timetable = Array(5).fill(null).map(() => Array(8).fill(null)); // 5 days, 8 time slots

    lectures.forEach(lecture => {
      timetable[lecture.dayOfWeek - 1][lecture.timeSlot] = {
        _id: lecture._id,
        subject: lecture.subject.name,
        teacher: {
          _id: lecture.teacher._id,
          name: lecture.teacher.name
        },
        status: lecture.status
      };
    });

    res.json(timetable);
  } catch (error) {
    console.error('Error fetching timetable:', error);
    res.status(500).json({ message: 'Server error while fetching timetable' });
  }
});

// @desc    Cancel a lecture
// @route   POST /api/activity/lecture/:lectureId/cancel
// @access  Private (Only assigned teacher)
router.post('/lecture/:lectureId/cancel', auth, isTeacher, async (req, res) => {
  try {
    const { lectureId } = req.params;
    const { reason } = req.body;

    const lecture = await Lecture.findById(lectureId);

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    // Check if the requesting teacher is assigned to this lecture
    if (lecture.teacher.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this lecture' });
    }

    lecture.status = 'cancelled';
    lecture.cancellationReason = reason;
    await lecture.save();

    // Notify students about cancellation
    await Notification.create({
      type: 'lecture_cancelled',
      title: 'Lecture Cancelled',
      message: `${lecture.subject.name} lecture has been cancelled. Reason: ${reason}`,
      recipients: await Batch.findById(lecture.batch).select('students').lean(),
      sender: req.user._id
    });

    res.json({ message: 'Lecture cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling lecture:', error);
    res.status(500).json({ message: 'Server error while cancelling lecture' });
  }
});

// @desc    Request lecture reschedule
// @route   POST /api/activity/lecture/reschedule
// @access  Private (Teachers only)
router.post('/lecture/reschedule', auth, isTeacher, async (req, res) => {
  try {
    const { lectureId, targetSlot } = req.body;

    const lecture = await Lecture.findById(lectureId)
      .populate('teacher', 'name')
      .populate('subject', 'name')
      .populate('batch', 'name');

    if (!lecture) {
      return res.status(404).json({ message: 'Lecture not found' });
    }

    // Check if target slot is free
    const existingLecture = await Lecture.findOne({
      batch: lecture.batch,
      dayOfWeek: targetSlot.dayOfWeek,
      timeSlot: targetSlot.timeSlot
    }).populate('teacher', 'name');

    if (!existingLecture) {
      // If slot is free, reschedule immediately
      lecture.dayOfWeek = targetSlot.dayOfWeek;
      lecture.timeSlot = targetSlot.timeSlot;
      await lecture.save();

      // Notify students about the reschedule
      await Notification.create({
        type: 'lecture_rescheduled',
        title: 'Lecture Rescheduled',
        message: `${lecture.subject.name} lecture has been rescheduled to ${targetSlot.dayOfWeek}, ${targetSlot.timeSlot}`,
        recipients: await Batch.findById(lecture.batch).select('students').lean(),
        sender: req.user._id
      });

      return res.json({ 
        message: 'Lecture rescheduled successfully',
        immediate: true 
      });
    }

    // If slot is occupied, create reschedule request
    const notification = await Notification.create({
      type: 'reschedule_request',
      title: 'Lecture Reschedule Request',
      message: `${lecture.teacher.name} wants to swap their ${lecture.subject.name} lecture with your ${existingLecture.subject.name} lecture`,
      sender: req.user._id,
      recipient: existingLecture.teacher._id,
      metadata: {
        requestedLecture: lecture._id,
        targetLecture: existingLecture._id,
        targetSlot
      },
      status: 'pending'
    });

    res.json({ 
      message: 'Reschedule request sent',
      immediate: false,
      notification 
    });
  } catch (error) {
    console.error('Error requesting reschedule:', error);
    res.status(500).json({ message: 'Server error while requesting reschedule' });
  }
});

// @desc    Respond to reschedule request
// @route   POST /api/activity/lecture/reschedule-response
// @access  Private (Teachers only)
router.post('/lecture/reschedule-response', auth, isTeacher, async (req, res) => {
  try {
    const { notificationId, accepted } = req.body;

    const notification = await Notification.findById(notificationId);
    if (!notification || notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: 'Notification not found or unauthorized' });
    }

    const { requestedLecture, targetLecture, targetSlot } = notification.metadata;

    if (accepted) {
      // Get both lectures
      const lecture1 = await Lecture.findById(requestedLecture);
      const lecture2 = await Lecture.findById(targetLecture);

      // Swap time slots
      const tempDay = lecture1.dayOfWeek;
      const tempSlot = lecture1.timeSlot;
      
      lecture1.dayOfWeek = lecture2.dayOfWeek;
      lecture1.timeSlot = lecture2.timeSlot;
      lecture2.dayOfWeek = tempDay;
      lecture2.timeSlot = tempSlot;

      await Promise.all([lecture1.save(), lecture2.save()]);

      // Notify students about the swap
      await Notification.create({
        type: 'lectures_swapped',
        title: 'Lectures Swapped',
        message: `${lecture1.subject.name} and ${lecture2.subject.name} lectures have been swapped`,
        recipients: await Batch.findById(lecture1.batch).select('students').lean(),
        sender: req.user._id
      });
    }

    // Update notification status
    notification.status = accepted ? 'accepted' : 'rejected';
    await notification.save();

    // Notify requesting teacher about the response
    await Notification.create({
      type: 'reschedule_response',
      title: 'Reschedule Request Response',
      message: `Your reschedule request has been ${accepted ? 'accepted' : 'rejected'}`,
      recipient: notification.sender,
      sender: req.user._id
    });

    res.json({ 
      message: `Reschedule request ${accepted ? 'accepted' : 'rejected'} successfully` 
    });
  } catch (error) {
    console.error('Error responding to reschedule:', error);
    res.status(500).json({ message: 'Server error while responding to reschedule request' });
  }
});

// @desc    Get teacher's notifications
// @route   GET /api/activity/notifications
// @access  Private (Teachers only)
router.get('/notifications', auth, isTeacher, async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipient: req.user._id },
        { recipients: req.user._id }
      ]
    })
    .sort('-createdAt')
    .limit(50);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
});

export default router;