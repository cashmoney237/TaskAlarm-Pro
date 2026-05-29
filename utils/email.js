const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: { rejectUnauthorized: false }
    });
  }
  return transporter;
};

// For password reset emails
const sendResetEmail = async (to, name, resetLink) => {
  const transporter = getTransporter();
  const fromEmail = process.env.EMAIL_USER; // Use Brevo relay user as sender
  const html = `
    <h2>Password Reset Request</h2>
    <p>Hello ${name},</p>
    <p>Click the link below to reset your password (valid for 1 hour):</p>
    <a href="${resetLink}">${resetLink}</a>
    <p>If you didn't request this, ignore this email.</p>
  `;
  const text = `Password Reset Request\n\nHello ${name},\n\nClick the link below:\n${resetLink}`;
  await transporter.sendMail({
    from: `"TaskAlarm Pro" <${fromEmail}>`,
    to,
    subject: 'Reset your TaskAlarm password',
    html,
    text
  });
};

// For task reminders
const sendTaskReminder = async (to, name, taskTitle, taskDescription, scheduledTime) => {
  const transporter = getTransporter();
  const fromEmail = process.env.EMAIL_USER; // Use Brevo relay user as sender
  const formattedTime = new Date(scheduledTime).toLocaleString();
  
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>TaskAlarm Pro</h2>
      <p>Hello ${name},</p>
      <p><strong>It's time to complete your task!</strong></p>
      <p><strong>Task:</strong> ${taskTitle}</p>
      <p><strong>Description:</strong> ${taskDescription || 'No description'}</p>
      <p><strong>Scheduled for:</strong> ${formattedTime}</p>
      <p>Log in to mark it as completed.</p>
      <p>Best regards,<br>TaskAlarm Team</p>
    </div>
  `;
  const text = `Task Reminder: ${taskTitle}\n\nHello ${name},\n\nIt's time to complete your task.\nTask: ${taskTitle}\nDescription: ${taskDescription || 'None'}\nScheduled: ${formattedTime}`;
  
  try {
    const info = await transporter.sendMail({
      from: `"TaskAlarm Pro" <${fromEmail}>`,
      to,
      subject: `🔔 Task Reminder: ${taskTitle}`,
      html,
      text
    });
    console.log(`✅ Email sent to ${to} - ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Email failed:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendResetEmail, sendTaskReminder };