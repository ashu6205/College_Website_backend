const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const morgan = require('morgan');
const http = require('http');
const socketIO = require('socket.io');
const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/error.middleware');
const passport = require('passport');
require('./config/passport');

// Import routes with error checking
let authRoutes, postRoutes, channelRoutes, lostFoundRoutes, academicRoutes, chatRoutes;

try {
    authRoutes = require('./routes/auth.routes');
    postRoutes = require('./routes/post.routes');
    channelRoutes = require('./routes/channel.routes');
    lostFoundRoutes = require('./routes/lostFound.routes');
    academicRoutes = require('./routes/academic.routes');
    chatRoutes = require('./routes/chat.routes');
} catch (error) {
    console.error('Error loading routes:', error);
    process.exit(1);
}

// Initialize express app and create HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join a channel room
    socket.on('join_channel', (channelId) => {
        socket.join(`channel_${channelId}`);
        console.log(`Socket ${socket.id} joined channel_${channelId}`);
    });

    // Leave a channel room
    socket.on('leave_channel', (channelId) => {
        socket.leave(`channel_${channelId}`);
        console.log(`Socket ${socket.id} left channel_${channelId}`);
    });

    // Handle typing status
    socket.on('typing', (data) => {
        socket.to(`channel_${data.channelId}`).emit('user_typing', {
            userId: data.userId,
            username: data.username
        });
    });

    // Handle read receipts
    socket.on('message_read', (data) => {
        socket.to(`channel_${data.channelId}`).emit('message_read_update', {
            messageId: data.messageId,
            userId: data.userId
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}));
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
// Static file serving
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'IIITG Express API is running' });
});

// Verify and use routes
if (authRoutes) app.use('/api/auth', authRoutes);
if (postRoutes) app.use('/api/posts', postRoutes);
if (channelRoutes) app.use('/api/channels', channelRoutes);
if (lostFoundRoutes) app.use('/api/lostfound', lostFoundRoutes);
if (academicRoutes) app.use('/api/academic', academicRoutes);
if (chatRoutes) app.use('/api/chat', chatRoutes);

// Error handling
app.use(errorHandler);

// Database connection
connectDB();

// Export both app and server
module.exports = { app, server };