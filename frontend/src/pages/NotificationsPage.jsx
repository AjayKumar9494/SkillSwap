import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PageLayout } from "../components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { api } from "../services/api";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (!notifications.find((n) => n._id === id)?.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "booking_approved":
        return "✅";
      case "booking_rejected":
        return "❌";
      case "booking_completed":
        return "🎉";
      case "booking_created":
        return "📅";
      case "booking_deleted":
      case "booking_cancelled":
        return "🚫";
      case "session_reminder":
        return "⏰";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "booking_approved":
        return "from-green-500 to-emerald-500";
      case "booking_rejected":
        return "from-red-500 to-rose-500";
      case "booking_completed":
        return "from-blue-500 to-cyan-500";
      case "booking_created":
        return "from-purple-500 to-indigo-500";
      case "booking_deleted":
      case "booking_cancelled":
        return "from-orange-500 to-red-500";
      case "session_reminder":
        return "from-amber-500 to-orange-500";
      default:
        return "from-slate-500 to-slate-600";
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-slate-600">Loading notifications...</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
            <p className="text-slate-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              Mark all as read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-6xl mb-4">🔕</div>
              <p className="text-slate-600 text-lg">No notifications yet</p>
              <p className="text-slate-500 text-sm mt-2">
                You'll see notifications here when teachers approve or reject your bookings
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification, idx) => (
              <motion.div
                key={notification._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.01, x: 5 }}
              >
                <Card
                  className={`border-2 ${
                    !notification.read
                      ? "border-blue-300 bg-blue-50/50"
                      : "border-slate-200"
                  } hover:shadow-md transition-all cursor-pointer`}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification._id);
                    }
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className={`text-4xl p-3 rounded-lg bg-gradient-to-br ${getNotificationColor(
                          notification.type
                        )} text-white shadow-md`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-slate-900 mb-1">
                              {notification.title}
                            </h3>
                            <p className="text-slate-600 mb-2">{notification.message}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                              <span>📅 {new Date(notification.createdAt).toLocaleString()}</span>
                              {notification.type === "booking_approved" && (
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate("/bookings?tab=accepted");
                                  }}
                                >
                                  View Accepted Sessions →
                                </Button>
                              )}
                              {notification.type === "booking_created" && (
                                <Button
                                  size="sm"
                                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7 px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate("/bookings?tab=pending");
                                  }}
                                >
                                  View Pending Sessions →
                                </Button>
                              )}
                              {notification.booking && notification.type !== "booking_approved" && notification.type !== "booking_created" && (
                                <Link
                                  to="/bookings"
                                  className="text-blue-600 hover:text-blue-700 font-semibold"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View Booking →
                                </Link>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <Badge className="bg-blue-500 text-white">New</Badge>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification._id);
                              }}
                              className="text-slate-400 hover:text-red-500 transition-colors text-xl"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default NotificationsPage;
