const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const router = express.Router();

// Helper to get the first user ID (for demo)
async function getDemoUserId() {
    const user = await User.findOne();
    if (!user) return null;
    return user._id;
}

// GET all tasks
router.get('/', async (req, res) => {
    try {
        const userId = await getDemoUserId();
        if (!userId) return res.json([]);
        const tasks = await Task.find({ userId });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE task
router.post('/', async (req, res) => {
    try {
        const userId = await getDemoUserId();
        if (!userId) return res.status(401).json({ error: 'No user found' });
        const { title, description, scheduledTime } = req.body;
        const task = new Task({ userId, title, description, scheduledTime });
        await task.save();
        res.status(201).json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE task
router.put('/:id', async (req, res) => {
    try {
        const userId = await getDemoUserId();
        if (!userId) return res.status(401).json({ error: 'No user found' });
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, userId },
            req.body,
            { new: true }
        );
        if (!task) return res.status(404).json({ error: 'Task not found' });
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE task
router.delete('/:id', async (req, res) => {
    try {
        const userId = await getDemoUserId();
        if (!userId) return res.status(401).json({ error: 'No user found' });
        await Task.findOneAndDelete({ _id: req.params.id, userId });
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;