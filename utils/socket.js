const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: '*', // Adjust for production
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Join a specific employee room (for private messages/notifications)
        socket.on('join', (userId) => {
            socket.join(userId);
            console.log(`User ${userId} joined room`);
        });

        // Join a chat room
        socket.on('join-chat', (roomId) => {
            socket.join(roomId);
            console.log(`User joined chat room: ${roomId}`);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected');
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

// Helper: Send notification
const sendNotification = (userId, notification) => {
    if (io) {
        io.to(userId.toString()).emit('notification', notification);
    }
};

// Helper: Send chat message
const emitMessage = (roomId, message) => {
    if (io) {
        io.to(roomId.toString()).emit('receive-message', message);
    }
};

module.exports = { initSocket, getIO, sendNotification, emitMessage };
