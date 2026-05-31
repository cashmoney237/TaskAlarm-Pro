const cron = require('node-cron');
const Task = require('../models/Task');
const User = require('../models/User');
const { sendTaskReminder } = require('./email');

function startCronJob(io) {
    console.log('⏰ Cron job started – checking tasks every minute');
    
    cron.schedule('* * * * *', async () => {
        console.log('🔍 Running task check at', new Date().toLocaleString());
        const now = Date.now(); // Use timestamp (milliseconds)
        
        // Find tasks that are due: scheduledTime (timestamp) <= now, not completed, not missed, not triggered
        const dueTasks = await Task.find({
            isCompleted: false,
            isMissed: false,
            scheduledTime: { $lte: now },
            alarmTriggered: false
        });
        
        console.log(`📋 Found ${dueTasks.length} due tasks`);
        
        for (const task of dueTasks) {
            console.log(`⏰ Processing due task: "${task.title}" (ID: ${task._id})`);
            
            // Mark as triggered
            task.alarmTriggered = true;
            await task.save();
            
            const user = await User.findById(task.userId);
            if (user) {
                console.log(`👤 User found: ${user.email}`);
                
                // Send socket event (if socket.io is configured)
                if (io) {
                    io.to(user._id.toString()).emit('task_due', {
                        taskId: task._id,
                        title: task.title,
                        description: task.description,
                        scheduledTime: task.scheduledTime
                    });
                }
                
                // Send email only once
                if (!task.emailSent) {
                    console.log(`📧 Attempting to send email to ${user.email} for task "${task.title}"`);
                    try {
                        const result = await sendTaskReminder(user.email, user.fullname, task.title, task.description, task.scheduledTime);
                        if (result.success) {
                            console.log(`✅ Email sent successfully to ${user.email}`);
                            task.emailSent = true;
                            await task.save();
                        } else {
                            console.error(`❌ Failed to send email to ${user.email}: ${result.error}`);
                        }
                    } catch (err) {
                        console.error(`❌ Email sending threw error: ${err.message}`);
                    }
                } else {
                    console.log(`ℹ️ Email already sent for task "${task.title}"`);
                }
            } else {
                console.log(`❌ User not found for task ${task._id}`);
            }
        }
        
        // Mark missed tasks (alarm triggered > 60 seconds ago and not completed)
        const oneMinuteAgo = Date.now() - 60000;
        const missedTasks = await Task.find({
            isCompleted: false,
            isMissed: false,
            alarmTriggered: true,
            scheduledTime: { $lt: oneMinuteAgo }
        });
        
        for (const task of missedTasks) {
            console.log(`⏰ Task "${task.title}" missed, marking as missed`);
            task.isMissed = true;
            await task.save();
            if (io) {
                io.to(task.userId.toString()).emit('task_missed', { taskId: task._id, title: task.title });
            }
        }
    });
}

module.exports = { startCronJob };