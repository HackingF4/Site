require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store io instance in app
app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const authMiddleware = require('./middleware/auth');

app.use('/auth', authRoutes);
app.use('/messages', messageRoutes);
app.use('/admin', authMiddleware, adminRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userData) => {
    socket.userData = userData;
    io.emit('userJoined', userData);
  });

  socket.on('message', async (data) => {
    try {
      // Check if user is muted
      const User = require('./models/User');
      const user = await User.findById(socket.userData?.id);
      
      if (user?.isMuted) {
        socket.emit('error', { message: 'You are currently muted and cannot send messages' });
        return;
      }

      const message = new Message({
        sender: socket.userData?.id,
        content: data.message,
        room: 'general',
        timestamp: new Date()
      });
      await message.save();

      const messageData = {
        userId: socket.userData?.id,
        username: socket.userData?.username,
        avatar: socket.userData?.avatar,
        message: data.message,
        timestamp: message.timestamp
      };

      io.emit('message', messageData);
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('error', { message: 'Error sending message' });
    }
  });

  socket.on('userMuted', (data) => {
    const muteMessage = `${data.username} foi mutado por violar as regras da nossa comunidade`;
    io.emit('userMuted', { userId: data.userId, username: data.username, message: muteMessage });
    // Send a system message to the chat about the mute
    io.emit('message', {
      userId: 'system',
      username: 'Sistema',
      message: muteMessage,
      timestamp: new Date()
    });
  });

  // Add userUnmuted event handler
  socket.on('userUnmuted', (data) => {
    io.emit('userUnmuted', { userId: data.userId });
  });

  socket.on('chatCleared', async (room) => {
    try {
      // Delete all messages in the room
      await Message.deleteMany({ room });
      io.emit('chatCleared', { room });
    } catch (error) {
      console.error('Error clearing chat:', error);
      socket.emit('error', { message: 'Error clearing chat' });
    }
  });

  socket.on('disconnect', () => {
    if (socket.userData) {
      io.emit('userLeft', socket.userData);
    }
    console.log('User disconnected:', socket.id);
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});