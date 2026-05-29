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

// ✅ Allow any origin (temporary fix for domain change)
app.use(cors({ origin: true, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const io = socketio(server, {
  cors: { origin: true, methods: ['GET', 'POST'], credentials: true }
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