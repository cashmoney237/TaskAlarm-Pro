const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendResetEmail, sendTaskReminder } = require('../utils/email');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { fullname, email, password } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    const user = new User({ fullname, email: email.toLowerCase(), password });
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, fullname, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(423).json({ error: `Account locked. Try again in ${minutesLeft} minutes.` });
    }
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= 3) user.lockedUntil = Date.now() + 15 * 60 * 1000;
      await user.save();
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    user.failedAttempts = 0;
    user.lockedUntil = null;
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, fullname: user.fullname, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: 'Email not registered' });
    const token = Math.random().toString(36).substr(2, 20) + Date.now();
    user.resetToken = token;
    user.resetExpiry = Date.now() + 3600000;
    await user.save();
    const resetLink = `${process.env.FRONTEND_URL}/reset-password.html?token=${token}`;
    await sendResetEmail(user.email, user.fullname, resetLink);
    res.json({ message: 'Reset link sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({ resetToken: token, resetExpiry: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetExpiry = undefined;
    await user.save();
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Test email endpoint (add this block)
router.post('/test-email', async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const result = await sendTaskReminder(email, name || 'User', 'Test Task', 'This is a test email from TaskAlarm Pro to verify email delivery.', new Date());
    if (result.success) {
      res.json({ message: 'Test email sent' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Manual email test endpoint
router.post('/test-email-manual', async (req, res) => {
    const { email, name, taskTitle, description } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    try {
        const result = await sendTaskReminder(email, name || 'Test User', taskTitle || 'Test Task', description || 'This is a test email from TaskAlarm.', new Date());
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;