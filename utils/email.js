const nodemailer = require('nodemailer');
const dns = require('dns');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: { rejectUnauthorized: false },
      // Force IPv4 lookup to avoid IPv6 routing issues on Render
      lookup: (hostname, callback) => {
        dns.lookup(hostname, 4, callback);
      }
    });
  }
  return transporter;
};

const sendResetEmail = async (to, name, resetLink) => {
  const transporter = getTransporter();
  const fromEmail = process.env.EMAIL_USER;
  const html = `<h2>Password Reset</h2><p>Hello ${name},</p><p><a href="${resetLink}">Click here</a> to reset your password.</p>`;
  const text = `Password Reset\n\nHello ${name},\n\nReset link: ${resetLink}`;
  await transporter.sendMail({
    from: `"TaskAlarm Pro" <${fromEmail}>`,
    to,
    subject: 'Reset your TaskAlarm password',
    html,
    text
  });
};

const sendTaskReminder = async (to, name, taskTitle, taskDescription, scheduledTime) => {
  const transporter = getTransporter();
  const fromEmail = process.env.EMAIL_USER;
  const formattedTime = new Date(scheduledTime).toLocaleString();
  const html = `
    <div style="font-family: Arial, sans-serif;">
      <h2>TaskAlarm Pro</h2>
      <p>Hello ${name},</p>
      <p>🔔 <strong>It's time to complete your task!</strong></p>
      <p><strong>Task:</strong> ${taskTitle}</p>
      <p><strong>Description:</strong> ${taskDescription || 'No description'}</p>
      <p><strong>Scheduled for:</strong> ${formattedTime}</p>
      <p>Log in to mark it as completed.</p>
      <p>Best regards,<br>TaskAlarm Team</p>
    </div>
  `;
  const text = `Task Reminder: ${taskTitle}\n\nHello ${name},\n\nTime to complete: ${taskTitle}\nDescription: ${taskDescription || 'None'}\nScheduled: ${formattedTime}`;
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