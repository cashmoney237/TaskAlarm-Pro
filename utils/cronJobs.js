const cron = require('node-cron');
const Task = require('../models/Task');
const User = require('../models/User');
const { sendTaskReminder } = require('./email');

function startCronJob(io) {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const dueTasks = await Task.find({
      isCompleted: false,
      isMissed: false,
      scheduledTime: { $lte: now },
      alarmTriggered: false
    });

    for (const task of dueTasks) {
      task.alarmTriggered = true;
      await task.save();
      const user = await User.findById(task.userId);
      if (user) {
        io.to(user._id.toString()).emit('task_due', {
          taskId: task._id,
          title: task.title,
          description: task.description,
          scheduledTime: task.scheduledTime
        });
        if (!task.emailSent) {
          task.emailSent = true;
          await task.save();
          try {
            await sendTaskReminder(user.email, user.fullname, task.title, task.description, task.scheduledTime);
          } catch(err) { console.error('Email send failed:', err); }
        }
      }
    }

    // Mark missed tasks (alarm triggered > 60 seconds ago)
    const oneMinuteAgo = new Date(now - 60000);
    const missedTasks = await Task.find({
      isCompleted: false,
      isMissed: false,
      alarmTriggered: true,
      scheduledTime: { $lt: oneMinuteAgo }
    });
    for (const task of missedTasks) {
      task.isMissed = true;
      await task.save();
      io.to(task.userId.toString()).emit('task_missed', { taskId: task._id, title: task.title });
    }
  });
}

module.exports = { startCronJob };