import TeacherPreference from '../models/teacherPreferenceSchema.js';
import User from '../models/userSchema.js';
import Classroom from '../models/classroomSchema.js';
import Subject from '../models/subjectSchema.js';
import StudentGroup from '../models/studentGroupSchema.js';
import { TimetableSlot } from '../models/timetableSlotSchema.js';
import mongoose from 'mongoose';

class TimetableGenerator {
  constructor(timetableId = null) {
    this.days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    this.timeSlots = [
      '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
    ];
    
    this.UNAVAILABLE = -1;
    this.AVAILABLE = 0;
    this.PREFERRED = 1;
    
    this.teachers = [];
    // For each teacher, we store daily data in teacherLimits as:
    // { daily: Map(day => { count, lastIndex }), weekly, maxDaily, maxWeekly }
    this.teacherLimits = new Map();
    this.classroomAvailability = new Map();
    this.timetableId = timetableId || new mongoose.Types.ObjectId();
  }

  // Helper to get teacher's preference for a given day/time slot.
  async getTeacherPreference(teacher, day, timeSlot) {
    const pref = await TeacherPreference.findOne({ teacherId: teacher._id });
    const dayPrefs = pref?.availableTimeSlots?.[day.toLowerCase()] || {};
    // If teacherPreference is explicitly defined, return it; otherwise default to AVAILABLE (0)
    const teacherPref = typeof dayPrefs[timeSlot] !== 'undefined' ? dayPrefs[timeSlot] : this.AVAILABLE;
    return teacherPref;
  }

  async initializeTracking() {
    const teacherLimits = new Map();
    const classroomAvailability = new Map();

    // Initialize teacher limits:
    for (const teacher of this.teachers) {
      const pref = await TeacherPreference.findOne({ teacherId: teacher._id });
      teacherLimits.set(teacher._id.toString(), {
        daily: new Map(this.days.map(day => [day, { count: 0, lastIndex: -1 }])),
        weekly: 0,
        maxDaily: pref?.maxSlotsPerDay || 6,
        maxWeekly: pref?.maxSlotsPerWeek || 30
      });
    }

    // Initialize classroom availability:
    const classrooms = await Classroom.find({});
    for (const classroom of classrooms) {
      classroomAvailability.set(classroom._id.toString(), {
        slots: new Map(this.days.map(day => [
          day, new Map(this.timeSlots.map(slot => [slot, true]))
        ]))
      });
    }

    return { teacherLimits, classroomAvailability };
  }

  async generateTimetable() {
    try {
      console.log('🚀 Starting timetable generation...');
      await TimetableSlot.deleteMany({});

      const [teachers, subjects, studentGroups] = await Promise.all([
        User.find({ role: 'teacher' }),
        Subject.find({}),
        StudentGroup.find({})
      ]);
      
      this.teachers = teachers;
      const studentGroup = studentGroups[0];
      if (!studentGroup) throw new Error('No student group found');

      const { teacherLimits, classroomAvailability } = await this.initializeTracking();
      this.teacherLimits = teacherLimits;
      this.classroomAvailability = classroomAvailability;

      // --- Round-robin scheduling ---
      // For each time slot index, loop through all days.
      for (let slotIndex = 0; slotIndex < this.timeSlots.length; slotIndex++) {
        for (const day of this.days) {
          const timeSlot = this.timeSlots[slotIndex];
          console.log(`\n📅 ${day} - Time slot: ${timeSlot}`);

          // Try to continue an existing assignment on that day if available.
          const previousAssignment = await this.tryContinuePreviousForDay(day, timeSlot, studentGroup);
          if (previousAssignment) continue;

          // Find the best teacher candidate for this day/time slot.
          const bestTeacher = await this.findBestTeacher(day, timeSlot);
          if (!bestTeacher) continue;
          await this.assignSlot(bestTeacher, day, timeSlot, studentGroup);
        }
      }

      console.log('✅ Timetable generation completed!');
      return this.getFormattedTimetable();
    } catch (error) {
      console.error('❌ Generation failed:', error);
      return [];
    }
  }

  // Similar to tryContinuePrevious but scoped to a given day.
  async tryContinuePreviousForDay(day, timeSlot, studentGroup) {
    for (const teacher of this.teachers) {
      const teacherPref = await this.getTeacherPreference(teacher, day, timeSlot);
      if (teacherPref === this.UNAVAILABLE) continue; // Skip if teacher is unavailable

      const teacherId = teacher._id.toString();
      const limits = this.teacherLimits.get(teacherId);
      const dayInfo = limits.daily.get(day);
      if (dayInfo.count === 0) continue; // Only continue if teacher already has an assignment today

      if (
        dayInfo.count >= limits.maxDaily ||
        limits.weekly >= limits.maxWeekly ||
        !this.isClassroomAvailable(day, timeSlot)
      ) continue;

      const classroom = await this.findAvailableClassroom(day, timeSlot);
      if (!classroom) continue;

      // Pick a subject for the teacher (here simply the first one)
      const subject = await this.selectSubject(teacher);
      if (!subject) continue;

      await TimetableSlot.create({
        timetableId: this.timetableId,
        dayName: day,
        timeSlotName: timeSlot,
        teacherId: teacher._id,
        subjectId: subject._id,
        studentGroupId: studentGroup._id,
        classroomId: classroom._id
      });

      dayInfo.count++;
      dayInfo.lastIndex = this.timeSlots.indexOf(timeSlot);
      limits.weekly++;

      this.markClassroomUnavailable(classroom._id.toString(), day, timeSlot);
      console.log(`🔁 Continued ${teacher.name} on ${day} at ${timeSlot}`);
      return { teacher, subject };
    }
    return null;
  }

  async findBestTeacher(day, timeSlot) {
    const candidates = [];
    const currentSlotIndex = this.timeSlots.indexOf(timeSlot);

    for (const teacher of this.teachers) {
      // Get the teacher's preference first; skip if unavailable.
      const teacherPref = await this.getTeacherPreference(teacher, day, timeSlot);
      if (teacherPref === this.UNAVAILABLE) continue;

      const teacherId = teacher._id.toString();
      const limits = this.teacherLimits.get(teacherId);
      const dayInfo = limits.daily.get(day);
      if (dayInfo.count >= limits.maxDaily) continue;
      if (limits.weekly >= limits.maxWeekly) continue;

      const subjects = await this.getTeachableSubjects(teacher);
      if (subjects.length === 0) continue;

      const consecutiveScore = this.calculateConsecutiveScore(teacherId, day, currentSlotIndex);
      const remainingSlots = limits.maxWeekly - limits.weekly;
      // Bonus for under-filled day (target = maxWeekly / number of days)
      const targetPerDay = limits.maxWeekly / this.days.length;
      const dailyUnderfillBonus = (targetPerDay - dayInfo.count) * 10; // adjust as needed

      const score = (teacherPref * 100) +
                    (remainingSlots * 30) +
                    (consecutiveScore * 50) +
                    (subjects.length * 20) +
                    dailyUnderfillBonus;
      candidates.push({ teacher, score, subjects, teacherPref });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  }

  calculateConsecutiveScore(teacherId, day, currentSlotIndex) {
    const dayInfo = this.teacherLimits.get(teacherId).daily.get(day);
    if (dayInfo.lastIndex === -1) return 0;
    const gap = currentSlotIndex - dayInfo.lastIndex - 1;
    if (gap < 0) return 0;
    return gap === 0 ? 2 : 2 / (gap + 1);
  }

  async assignSlot(candidate, day, timeSlot, studentGroup) {
    const teacher = candidate.teacher;
    const teacherId = teacher._id.toString();
    const subject = await this.selectSubject(teacher);
    if (!subject) return null;

    const classroom = await this.findAvailableClassroom(day, timeSlot);
    if (!classroom) return null;

    await TimetableSlot.create({
      timetableId: this.timetableId,
      dayName: day,
      timeSlotName: timeSlot,
      teacherId: teacher._id,
      subjectId: subject._id,
      studentGroupId: studentGroup._id,
      classroomId: classroom._id
    });

    const limits = this.teacherLimits.get(teacherId);
    const dayInfo = limits.daily.get(day);
    dayInfo.count++;
    dayInfo.lastIndex = this.timeSlots.indexOf(timeSlot);
    limits.weekly++;

    this.markClassroomUnavailable(classroom._id.toString(), day, timeSlot);
    console.log(`✅ Assigned ${teacher.name} on ${day} at ${timeSlot} (${limits.weekly}/${limits.maxWeekly})`);
    return { teacher, subject };
  }

  async selectSubject(teacher) {
    const populatedTeacher = await User.findById(teacher._id).populate('metadata.subjects');
    const subjects = populatedTeacher.metadata?.subjects || [];
    return subjects.length > 0 ? subjects[0] : null;
  }

  async findAvailableClassroom(day, timeSlot) {
    for (const [classroomId, availability] of this.classroomAvailability) {
      if (availability.slots.get(day).get(timeSlot)) {
        return Classroom.findById(classroomId);
      }
    }
    return null;
  }

  markClassroomUnavailable(classroomId, day, timeSlot) {
    const classroom = this.classroomAvailability.get(classroomId);
    if (classroom) {
      classroom.slots.get(day).set(timeSlot, false);
    }
  }

  isClassroomAvailable(day, timeSlot) {
    return [...this.classroomAvailability.values()].some(classroom =>
      classroom.slots.get(day).get(timeSlot)
    );
  }

  async getTeachableSubjects(teacher) {
    const populatedTeacher = await User.findById(teacher._id).populate('metadata.subjects');
    return populatedTeacher.metadata?.subjects || [];
  }

  async getFormattedTimetable() {
    return TimetableSlot.find()
      .populate('teacherId', 'name')
      .populate('subjectId', 'name')
      .populate('classroomId', 'name')
      .populate('studentGroupId', 'name')
      .sort({ dayName: 1, timeSlotName: 1 })
      .lean();
  }
}

export default TimetableGenerator;
