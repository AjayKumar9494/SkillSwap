import { Notification } from "../models/Notification.js";
import { sendMail } from "../config/mailer.js";
import { User } from "../models/User.js";
import { Booking } from "../models/Booking.js";

/**
 * Create and send notification to user
 */
export const createNotification = async ({ userId, type, title, message, bookingId }) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      booking: bookingId,
    });

    // Send email notification
    const user = await User.findById(userId);
    if (user && user.email) {
      await sendNotificationEmail(user.email, type, title, message, bookingId);
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't throw - notifications are not critical
  }
};

/**
 * Send email notification
 */
const sendNotificationEmail = async (email, type, title, message, bookingId) => {
  try {
    let booking = null;
    if (bookingId) {
      booking = await Booking.findById(bookingId)
        .populate("skill", "title")
        .populate("learner", "name")
        .populate("teacher", "name");
    }

    const clientUrl = process.env.CLIENT_URL?.split(",")[0] || "http://localhost:5173";
    const bookingLink = bookingId ? `${clientUrl}/bookings` : clientUrl;

    let emailSubject = title;
    let emailBody = "";

    switch (type) {
      case "booking_approved":
        emailSubject = `✅ Session Approved: ${booking?.skill?.title || "Your booking"}`;
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Great News! Your Session Has Been Approved</h2>
            <p>Hello,</p>
            <p>Your booking request for <strong>${booking?.skill?.title || "a skill"}</strong> has been approved by <strong>${booking?.teacher?.name || "the teacher"}</strong>!</p>
            ${booking?.sessionDate ? `<p><strong>Session Date:</strong> ${new Date(booking.sessionDate).toLocaleString()}</p>` : ""}
            ${booking?.sessionDuration ? `<p><strong>Duration:</strong> ${booking.sessionDuration} minutes</p>` : ""}
            <p>You can now join the video call when the session starts.</p>
            <a href="${bookingLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">View Booking</a>
          </div>
        `;
        break;

      case "booking_rejected":
        emailSubject = `❌ Session Request Rejected: ${booking?.skill?.title || "Your booking"}`;
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Session Request Rejected</h2>
            <p>Hello,</p>
            <p>Unfortunately, your booking request for <strong>${booking?.skill?.title || "a skill"}</strong> has been rejected by <strong>${booking?.teacher?.name || "the teacher"}</strong>.</p>
            <p>Your credits have been refunded to your account.</p>
            <p>You can browse other skills or try booking again.</p>
            <a href="${clientUrl}/skills" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Browse Skills</a>
          </div>
        `;
        break;

      case "booking_completed":
        emailSubject = `🎉 Session Completed: ${booking?.skill?.title || "Your session"}`;
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Session Completed Successfully!</h2>
            <p>Hello,</p>
            <p>Your session for <strong>${booking?.skill?.title || "a skill"}</strong> has been marked as completed.</p>
            <p>Don't forget to leave a review to help the community!</p>
            <a href="${bookingLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">Leave Review</a>
          </div>
        `;
        break;

      case "session_reminder":
        emailSubject = `⏰ Session Reminder: ${booking?.skill?.title || "Your session"}`;
        emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">Session Reminder</h2>
            <p>Hello,</p>
            <p>This is a reminder that your session for <strong>${booking?.skill?.title || "a skill"}</strong> is coming up soon.</p>
            ${booking?.sessionDate ? `<p><strong>Session Time:</strong> ${new Date(booking.sessionDate).toLocaleString()}</p>` : ""}
            <p>Make sure you're ready to join!</p>
            <a href="${bookingLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">View Booking</a>
          </div>
        `;
        break;

      default:
        emailBody = `<p>${message}</p>`;
    }

    await sendMail({
      to: email,
      subject: emailSubject,
      html: emailBody,
    });
  } catch (error) {
    console.error("Error sending notification email:", error);
    // Don't throw - email failures shouldn't break the flow
  }
};

/**
 * Get user notifications
 */
export const getUserNotifications = async (userId, limit = 20) => {
  return Notification.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("booking", "skill status")
    .lean();
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true, readAt: new Date() },
    { new: true }
  );
};

/**
 * Mark all notifications as read for user
 */
export const markAllNotificationsAsRead = async (userId) => {
  return Notification.updateMany(
    { user: userId, read: false },
    { read: true, readAt: new Date() }
  );
};
