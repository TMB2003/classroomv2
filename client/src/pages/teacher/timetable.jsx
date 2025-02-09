const express = require("express");
const router = express.Router();
const Timetable = require("../models/Timetable"); // Importing the Timetable model
const authMiddleware = require("../middleware/auth"); // Middleware for authentication

// DELETE Route - Remove a specific slot from the timetable
router.delete("/delete", authMiddleware, async (req, res) => {
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

module.exports = router;
