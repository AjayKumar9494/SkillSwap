import { asyncHandler } from "../middleware/asyncHandler.js";
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../utils/notifications.js";
import { Notification } from "../models/Notification.js";

export const getMyNotifications = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 50;
  const notifications = await getUserNotifications(req.user._id, limit);
  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
  
  res.json({
    notifications,
    unreadCount,
  });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await markNotificationAsRead(req.params.id, req.user._id);
  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }
  res.json(notification);
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await markAllNotificationsAsRead(req.user._id);
  res.json({ message: "All notifications marked as read" });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!notification) {
    return res.status(404).json({ message: "Notification not found" });
  }
  res.json({ message: "Notification deleted" });
});
