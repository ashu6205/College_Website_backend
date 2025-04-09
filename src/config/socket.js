// config/socket.js
const socketIO = require('socket.io');

const initializeSocket = (server) => {
    const io = socketIO(server);

    io.on('connection', (socket) => {
        console.log('New client connected');

        socket.on('join_channel', (channelId) => {
            socket.join(`channel_${channelId}`);
        });

        socket.on('leave_channel', (channelId) => {
            socket.leave(`channel_${channelId}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected');
        });
    });

    return io;
};

module.exports = initializeSocket;