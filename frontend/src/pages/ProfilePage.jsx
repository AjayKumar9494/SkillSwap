import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PageLayout } from "../components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert } from "../components/Alert";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { StatCard } from "../components/StatCard";

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    mySkills: [],
    bookings: [],
    transactions: [],
    earnings: 0,
    completedSessions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [{ data: skillRes }, { data: bookingRes }, { data: transactionRes }] = await Promise.all([
        api.get("/skills", { params: { owner: user?._id, limit: 10 } }),
        api.get("/bookings/mine"),
        api.get("/transactions/mine", { params: { limit: 20 } }),
      ]);
      
      const mySkills = skillRes.items || [];
      const allBookings = bookingRes || [];
      const transactions = transactionRes?.items || transactionRes || [];
      
      const teacherBookings = allBookings.filter((b) => String(b.teacher?._id || b.teacher) === String(user?._id));
      const studentBookings = allBookings.filter((b) => String(b.learner?._id || b.learner) === String(user?._id));
      
      const earnings = transactions
        .filter((t) => t.type === "earn" && t.description?.includes("Completed session"))
        .reduce((sum, t) => sum + t.amount, 0);
      
      const completedSessions = studentBookings.filter((b) => b.status === "completed");
      
      // Calculate total sessions (all bookings as learner)
      const totalSessions = studentBookings.length;
      
      // Calculate unique skills learned (from completed bookings as learner)
      const skillsLearned = new Set();
      completedSessions.forEach((booking) => {
        if (booking.skill?._id || booking.skill) {
          skillsLearned.add(String(booking.skill?._id || booking.skill));
        }
      });
      
      setStats({
        mySkills,
        bookings: allBookings,
        transactions,
        earnings,
        completedSessions: completedSessions.length,
        totalSessions,
        skillsLearned: skillsLearned.size,
        teacherBookings: teacherBookings.length,
        studentBookings: studentBookings.length,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    setError("");
    try {
      const { data } = await api.put("/users/me", { name });
      setUser(data.user);
      setStatus("Profile updated successfully!");
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    }
  };

  const isTeacher = stats.mySkills.length > 0 || stats.teacherBookings > 0;

  // Calculate account age
  const accountCreated = user?.createdAt ? new Date(user.createdAt) : null;
  const daysSinceJoined = accountCreated 
    ? Math.floor((new Date() - accountCreated) / (1000 * 60 * 60 * 24))
    : 0;

  // Recent transactions for activity timeline
  const recentTransactions = stats.transactions.slice(0, 5);

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header Section - Profile Focused */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="w-1 h-8 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.2 }}
            />
            <p className="text-sm font-semibold text-purple-600 uppercase tracking-wide">Profile Settings</p>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-900 via-pink-900 to-purple-900 bg-clip-text text-transparent">
                My Profile
              </h1>
              <p className="text-slate-600 mt-2">Manage your personal information and account settings</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Member Since</p>
              <p className="text-lg font-bold text-purple-600">
                {accountCreated 
                  ? new Date(accountCreated).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : "Recently"}
              </p>
              {daysSinceJoined > 0 && (
                <p className="text-xs text-slate-500">{daysSinceJoined} days</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Profile Header Card - Large Avatar & Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 border-purple-200 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center text-white text-5xl font-bold shadow-2xl"
                >
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </motion.div>
                <div className="flex-1 text-center md:text-left text-white">
                  <h2 className="text-3xl font-bold mb-2">{user?.name || "User"}</h2>
                  <p className="text-white/90 mb-4">{user?.email}</p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                      {isTeacher ? "👨‍🏫 Teacher" : "🎓 Learner"}
                    </Badge>
                    {user?.averageRating > 0 && (
                      <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                        ⭐ {(user?.averageRating || 0).toFixed(1)} Rating
                      </Badge>
                    )}
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                      💰 {user?.credits ?? 0} Credits
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Profile Information Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-slate-200">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>⚙️</span> Account Settings
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">Update your personal information</p>
            </CardHeader>
            <CardContent className="pt-6 bg-gradient-to-br from-white to-slate-50">
              {status && <Alert variant="success" className="mb-4">{status}</Alert>}
              {error && <Alert variant="error" className="mb-4">{error}</Alert>}
              
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Display Name</label>
                    <Input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      required
                      className="border-2 focus:border-blue-500"
                    />
                    <p className="text-xs text-slate-500">This is how others will see your name</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                    <div className="h-10 px-3 py-2 rounded-lg border-2 border-slate-200 bg-slate-50 flex items-center text-slate-600">
                      {user?.email}
                    </div>
                    <p className="text-xs text-slate-500">Email cannot be changed</p>
                  </div>
                </div>

                {/* Account Statistics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 p-5 rounded-xl bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 border-2 border-purple-200">
                  <div className="text-center p-4 rounded-lg bg-white/60 backdrop-blur-sm">
                    <div className="text-3xl mb-2">⭐</div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Average Rating</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                      {(user?.averageRating || 0).toFixed(1)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">from {user?.reviewsCount || 0} reviews</p>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-white/60 backdrop-blur-sm">
                    <div className="text-3xl mb-2">📚</div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Skills Learned</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {stats.skillsLearned || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">unique skills</p>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-white/60 backdrop-blur-sm">
                    <div className="text-3xl mb-2">📊</div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Total Sessions</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {stats.totalSessions || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">all sessions</p>
                  </div>
                  
                  <div className="text-center p-4 rounded-lg bg-white/60 backdrop-blur-sm">
                    <div className="text-3xl mb-2">✅</div>
                    <p className="text-xs text-slate-600 uppercase tracking-wide mb-1">Completed</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {stats.completedSessions || 0}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">sessions</p>
                  </div>
                </div>

                {/* Account Details */}
                <div className="space-y-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between py-2 border-b border-slate-200">
                    <span className="text-sm font-medium text-slate-600">Account Created</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {accountCreated 
                        ? new Date(accountCreated).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric'
                          })
                        : "Recently"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-200">
                    <span className="text-sm font-medium text-slate-600">Last Login</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {user?.lastLoginDate 
                        ? new Date(user.lastLoginDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-slate-600">Account Status</span>
                    <Badge className="bg-green-100 text-green-700 border-green-300">
                      ✓ Active
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all">
                    💾 Save Changes
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/dashboard">← Back to Dashboard</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-2 border-slate-200 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-slate-200">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span>📊</span> Recent Activity Timeline
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">Your account activity history</p>
            </CardHeader>
            <CardContent className="pt-6">
              {recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentTransactions.map((t, idx) => (
                    <motion.div
                      key={t._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + idx * 0.1 }}
                      className="flex items-start gap-4 p-4 rounded-lg border-2 border-slate-200 hover:border-purple-300 bg-gradient-to-r from-white to-slate-50 transition-all group"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg shadow-md ${
                        t.type === "earn" 
                          ? "bg-gradient-to-br from-green-400 to-emerald-500" 
                          : "bg-gradient-to-br from-blue-400 to-indigo-500"
                      }`}>
                        {t.type === "earn" ? "💰" : "💸"}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{t.description}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(t.createdAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className={`text-lg font-bold ${
                        t.type === "earn" ? "text-green-600" : "text-blue-600"
                      }`}>
                        {t.type === "earn" ? "+" : "-"}{t.amount}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="text-slate-600">No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageLayout>
  );
};

export default ProfilePage;

