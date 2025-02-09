import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/userSchema.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Debug middleware for this route
router.use((req, res, next) => {
  console.log('User route accessed:', req.path, req.method);
  console.log('Authenticated User:', req.user);
  next();
});

// Get current user's profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, department, phone } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (name) user.name = name;
    if (department) user.department = department;
    if (phone) user.phone = phone;

    await user.save();

    // Return updated user (excluding password)
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Change teacher password route  
router.put('/teacher/change-password', auth, isTeacher, async (req, res) => {
	try {
		const { newPassword } = req.body;
		const teacher = await User.findById(req.user._id);

		if (!teacher || teacher.role !== 'teacher') {
			return res.status(404).json({ message: 'Teacher not found' });
		}

		// Update password
		teacher.password = newPassword;
		await teacher.save(); // This will trigger the password hashing middleware

		res.json({ message: 'Password updated successfully' });
	} catch (error) {
		res.status(500).json({ message: 'Server error', error: error.message });
	}
});



export default router;