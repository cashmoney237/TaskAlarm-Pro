require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketio = require('socket.io');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const { startCronJob } = require('./utils/cronJobs');
const setupSocket = require('./sockets');

const app = express();
const server = http.createServer(app);

// Allow both localhost and your Vercel frontend
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5500',
    'https://elumba-mike-lawrce.vercel.app'
].filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Middleware: Accept token from query string (for frontend compatibility)
app.use((req, res, next) => {
    if (req.query.token && !req.headers.authorization) {
        // Decode the token (it may be URL-encoded)
        const token = decodeURIComponent(req.query.token);
        req.headers.authorization = `Bearer ${token}`;
    }
    next();
});

const io = socketio(server, {
    cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true }
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
setupSocket(io);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskalarm';
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected');
        startCronJob(io);
        const PORT = process.env.PORT || 5000;
        server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });