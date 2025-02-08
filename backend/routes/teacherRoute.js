import express from 'express';
import TimeTable from '../models/timetableModel.js';
import User from '../models/userSchema.js';
import { auth } from '../middleware/auth.js';
import Timetable from '../models/timetableModel.js';
import mongoose from 'mongoose';

const router = express.Router();

// Get all batches being taught by the teacher
router.get('/batches', auth, async (req, res) => {
    try {
        // Get the teacher ID from the authenticated user
        const teacherId = req.user.id;
        console.log("Teacher ID ", teacherId);

        // Find all unique student groups from timetable where this teacher is teaching
        const timetableEntries = await TimeTable.find({ 'teacher': teacherId })
            .populate('subject', 'name')
            .populate('studentGroup', 'name grade section strength')
            .lean();
        console.log(timetableEntries);

        // Extract unique student groups
        const batchesMap = new Map();
        timetableEntries.forEach(entry => {
            const groupId = entry.studentGroup._id.toString();
            if (!batchesMap.has(groupId)) {
                batchesMap.set(groupId, {
                    _id: entry.studentGroup._id,
                    name: entry.studentGroup.name,
                    grade: entry.studentGroup.grade,
                    section: entry.studentGroup.section,
                    strength: entry.studentGroup.strength,
                    subjects: new Set()
                });
            }
            batchesMap.get(groupId).subjects.add(entry.subject.name);
        });

        // Convert subjects Set to Array for each batch
        const batches = Array.from(batchesMap.values()).map(batch => ({
            ...batch,
            subjects: Array.from(batch.subjects)
        }));

        res.json(batches);
    } catch (error) {
        console.error('Error fetching teacher batches:', error);
        res.status(500).json({ message: 'Error fetching batches', error: error.message });
    }
});

// Get teacher's student group
router.get('/student-groups', auth, async (req, res) => {
    try {
        const teacherId = req.user.id;

        // Find the teacher and populate their student group
        const teacher = await User.findById(teacherId)
            .populate({
                path: 'studentGroup',
                select: 'name grade section strength students',
                populate: {
                    path: 'students',
                    select: 'name email'
                }
            })
            .lean();

        if (!teacher || !teacher.studentGroup) {
            return res.status(404).json({
                success: false,
                message: 'No student group found for this teacher'
            });
        }

        const group = teacher.studentGroup;
        const studentGroup = {
            _id: group._id,
            name: group.name,
            grade: group.grade,
            section: group.section,
            strength: group.strength,
            studentCount: group.students?.length || 0,
            students: group.students || [],
            subjects: []  // You might want to populate this from subjects collection
        };

        res.json({
            success: true,
            data: [studentGroup],  // Keeping array format for compatibility
            count: 1
        });

    } catch (error) {
        console.error('Error fetching student group:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching student group',
            error: error.message
        });
    }
});

// Get distinct student groups from teacher's timetable
router.get('/timetable', auth, async (req, res) => {
    try {
        // Find active timetable
        const activeTimetable = await Timetable.findOne({ isActive: true });
        
        if (!activeTimetable) {
            return res.status(404).json({
                success: false,
                message: 'No active timetable found'
            });
        }

        // Find distinct student groups for this teacher
        const slots = await TimeTable.find({
            timetableId: activeTimetable._id,
            teacherId: new mongoose.Types.ObjectId(req.user.id)
        })
        .populate('studentGroupId', 'name grade section strength')
        .lean();

        // Get distinct student groups
        const groupsMap = new Map();
        slots.forEach(slot => {
            if (slot.studentGroupId) {
                const group = slot.studentGroupId;
                groupsMap.set(group._id.toString(), group);
            }
        });

        const distinctGroups = Array.from(groupsMap.values());

        res.json({
            success: true,
            data: distinctGroups,
            count: distinctGroups.length
        });

    } catch (error) {
        console.error('Error fetching student groups:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching student groups',
            error: error.message
        });
    }
});

export default router;
