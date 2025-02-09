import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/userSchema.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Debug middleware for this route
router.use((req, res, next) => {
  console.log('userProfile route accessed:');
  console.log('Path:', req.path);
  console.log('Method:', req.method);
  console.log('User:', req.user);
  next();
});

// Get current user's profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Error in /me route:', error);
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
    
    // Return updated user without password
    const updatedUser = await User.findById(req.user.id).select('-password');
    res.json(updatedUser);
  } catch (error) {
    console.error('Error in /profile route:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update password
router.put('/password', auth, async (req, res) => {
  console.log('Password update route hit');
  try {
    const { currentPassword, newPassword } = req.body;
    console.log('Request body received:', { currentPassword: !!currentPassword, newPassword: !!newPassword });

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required' });
    }

    const user = await User.findById(req.user.id);
    console.log('User found:', !!user);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();
    console.log('Password updated successfully');
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error in /password route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/userSchema.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Update password
router.put('/password', auth, async (req, res) => {
  console.log('Password update route hit');

  try {
    const { currentPassword, newPassword } = req.body;
    console.log('Received password update request');

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Get user from database
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Prevent using the same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password cannot be the same as the current password' });
    }

    // Hash new password securely
    try {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    } catch (err) {
      console.error('Error hashing password:', err);
      return res.status(500).json({ message: 'Error updating password' });
    }

    // Save updated password
    await user.save();
    console.log('Password updated successfully');
    
    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Error in /password route:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Export the router
export default router;