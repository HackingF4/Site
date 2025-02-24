const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get message history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const messages = await Message.find({ room: 'general' })
      .sort({ timestamp: -1 })
      .limit(50)
      .populate('sender', 'username avatar');

    res.json(messages.map(msg => ({
      userId: msg.sender._id,
      username: msg.sender.username,
      avatar: msg.sender.avatar,
      message: msg.content,
      timestamp: msg.timestamp
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching message history' });
  }
});

module.exports = router;