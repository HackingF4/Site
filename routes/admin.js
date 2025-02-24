const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (user && user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Access denied: Admin only' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error checking admin status', error: error.message });
  }
};

// Ban user
router.post('/ban/:userId', isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isBanned: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User banned successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error banning user', error: error.message });
  }
});

// Unban user
router.post('/unban/:userId', isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isBanned: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User unbanned successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error unbanning user', error: error.message });
  }
});

// Mute user
router.post('/mute/:userId', isAdmin, async (req, res) => {
  try {
    // Check if target user exists and get their role
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if trying to mute an admin
    if (targetUser.role === 'admin') {
      return res.status(403).json({ message: 'Cannot mute administrators' });
    }

    // Check if trying to mute themselves
    if (req.user.userId === req.params.userId) {
      return res.status(403).json({ message: 'Cannot mute yourself' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isMuted: true },
      { new: true }
    );

    res.json({ message: 'User muted successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error muting user', error: error.message });
  }
});

// Unmute user
router.post('/unmute/:userId', isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isMuted: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Emit socket event for unmute
    req.app.get('io').emit('userUnmuted', { userId: user._id });

    res.json({ message: 'User unmuted successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error unmuting user', error: error.message });
  }
});

// Clear chat messages
router.post('/clear-chat', isAdmin, async (req, res) => {
  try {
    const { room } = req.body;
    await Message.deleteMany({ room });

    res.json({ message: 'Chat cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing chat', error: error.message });
  }
});

// Get all users (for admin panel)
router.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

module.exports = router;