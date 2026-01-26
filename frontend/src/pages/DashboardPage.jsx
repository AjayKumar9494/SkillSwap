import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PageLayout } from "../components/PageLayout";
import { StatCard } from "../components/StatCard";
import { SkillCard } from "../components/SkillCard";
import { BookingCard } from "../components/BookingCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const DashboardPage = () => {
  const { user } = useAuth();
  const [mySkills, setMySkills] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: skillRes }, { data: bookingRes }, { data: transactionRes }] = await Promise.all([
        api.get("/skills", { params: { owner: user?._id, limit: 10 } }),
        api.get("/bookings/mine"),
        api.get("/transactions/mine", { params: { limit: 10 } }),
      ]);
      setMySkills(skillRes.items || []);
      setAllBookings(bookingRes || []);
      setTransactions(transactionRes?.items || transactionRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleDeleteSkill = async (skillId) => {
    try {
      await api.delete(`/skills/${skillId}`);
      // Remove the skill from the local state
      setMySkills((prev) => prev.filter((skill) => skill._id !== skillId));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete skill");
    }
  };

  // Separate bookings by role
  const teacherBookings = allBookings.filter((b) => String(b.teacher?._id || b.teacher) === String(user?._id));
  const studentBookings = allBookings.filter((b) => String(b.learner?._id || b.learner) === String(user?._id));

  // Calculate total earnings from both Live Sessions and Video format
  const earnings = transactions
    .filter((t) => {
      if (t.type !== "earn") return false;
      // Include earnings from completed live sessions
      if (t.description?.includes("Completed session")) return true;
      // Include earnings from video unlocks
      if (t.description?.includes("Video watched") || t.meta?.kind === "video_unlock") return true;
      return false;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // Separate earnings by source
  const liveSessionEarnings = transactions
    .filter((t) => t.type === "earn" && t.description?.includes("Completed session"))
    .reduce((sum, t) => sum + t.amount, 0);
  
  const videoFormatEarnings = transactions
    .filter((t) => t.type === "earn" && (t.description?.includes("Video watched") || t.meta?.kind === "video_unlock"))
    .reduce((sum, t) => sum + t.amount, 0);

  // Upcoming sessions (approved bookings)
  const upcomingSessions = allBookings.filter(
    (b) => b.status === "approved" && new Date(b.sessionDate || Date.now()) >= new Date()
  );

  // Pending requests (for teachers)
  const pendingRequests = teacherBookings.filter((b) => b.status === "pending");

  // Completed sessions (for students - learning history)
  const completedSessions = studentBookings.filter((b) => b.status === "completed");

  const isTeacher = mySkills.length > 0 || teacherBookings.length > 0;

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-screen items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <motion.div
              className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-slate-600">Loading dashboard...</p>
          </motion.div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4"
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="w-1 h-8 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.2 }}
            />
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Dashboard</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent"
              >
                Welcome back, <span className="text-blue-600">{user?.name}</span>! 👋
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-slate-600 mt-2"
              >
                Here's what's happening with your skills today
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-3"
            >
              <Button asChild variant="outline" className="shadow-md hover:shadow-lg transition-all">
                <Link to="/skills/new">List a Skill</Link>
              </Button>
              <Button asChild className="shadow-lg hover:shadow-xl transition-all hover:scale-105">
                <Link to="/skills">Browse Skills</Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Credits"
            value={user?.credits ?? 0}
            helper="Available credits"
            index={0}
          />
          <StatCard
            title="Rating"
            value={(user?.averageRating || 0).toFixed(1)}
            helper="Average rating"
            index={1}
          />
          {isTeacher ? (
            <>
              <StatCard
                title="Listed Skills"
                value={mySkills.length}
                helper="Skills you're teaching"
                index={2}
              />
              <StatCard
                title="Total Earnings"
                value={earnings}
                helper={`Live Sessions: ${liveSessionEarnings} | Video Format: ${videoFormatEarnings}`}
                index={3}
              />
            </>
          ) : (
            <>
              <StatCard
                title="Booked Skills"
                value={studentBookings.length}
                helper="Skills you're learning"
                index={2}
              />
              <StatCard
                title="Completed"
                value={completedSessions.length}
                helper="Sessions completed"
                index={3}
              />
            </>
          )}
        </div>

        {/* Teacher Dashboard */}
        {isTeacher && (
          <>
            {/* Listed Skills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-2 border-slate-200 hover:border-blue-300 transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <span className="text-2xl">📚</span>
                      </div>
                      <CardTitle>My Listed Skills</CardTitle>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shadow-sm hover:shadow-md">
                      <Link to="/skills/new">+ Add Skill</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {mySkills.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {mySkills.slice(0, 6).map((skill, idx) => (
                        <motion.div
                          key={skill._id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 + idx * 0.05 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <SkillCard skill={skill} onDelete={handleDeleteSkill} showDelete={true} />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-12 text-center"
                    >
                      <div className="text-6xl mb-4">📝</div>
                      <p className="text-slate-600 mb-4 text-lg">You haven't listed any skills yet.</p>
                      <Button asChild size="lg" className="shadow-lg">
                        <Link to="/skills/new">List Your First Skill</Link>
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="border-2 border-amber-200 bg-amber-50/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <span className="text-2xl">⏳</span>
                        </div>
                        <CardTitle>Pending Student Requests</CardTitle>
                      </div>
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                        {pendingRequests.length} New
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingRequests.slice(0, 5).map((booking, idx) => (
                        <motion.div
                          key={booking._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + idx * 0.05 }}
                          whileHover={{ x: 5, scale: 1.01 }}
                          className="flex items-center justify-between rounded-xl border-2 border-amber-200 bg-white p-4 shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="flex-1">
                            <p className="font-bold text-slate-900">{booking.skill?.title}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              From: <span className="font-semibold">{booking.learner?.name}</span>
                            </p>
                            {booking.message && (
                              <p className="text-sm text-slate-500 mt-2 italic">"{booking.message}"</p>
                            )}
                          </div>
                          <Button asChild size="sm" className="ml-4 shadow-md">
                            <Link to="/bookings">Review</Link>
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Upcoming Sessions */}
            {upcomingSessions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card className="border-2 border-green-200 bg-green-50/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <span className="text-2xl">📅</span>
                      </div>
                      <CardTitle>Upcoming Sessions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {upcomingSessions.slice(0, 5).map((booking, idx) => (
                        <motion.div
                          key={booking._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + idx * 0.05 }}
                          whileHover={{ x: 5, scale: 1.01 }}
                          className="flex items-center justify-between rounded-xl border-2 border-green-200 bg-white p-4 shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="flex-1">
                            <p className="font-bold text-slate-900">{booking.skill?.title}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              With: <span className="font-semibold">{booking.learner?.name}</span>
                            </p>
                            {booking.sessionDate && (
                              <p className="text-sm text-slate-500 mt-1">
                                🕐 {new Date(booking.sessionDate).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <Button asChild size="sm" className="ml-4 bg-gradient-to-r from-blue-600 to-purple-600 shadow-md hover:shadow-lg">
                            <Link to={`/video-call/${booking._id}`}>🎥 Join Call</Link>
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Earnings Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <span className="text-2xl">💵</span>
                      </div>
                      <div>
                        <CardTitle>Total Earnings</CardTitle>
                        <p className="text-sm text-slate-500 mt-1">
                          Live Sessions: <span className="font-semibold text-blue-600">{liveSessionEarnings}</span> credits • 
                          Video Format: <span className="font-semibold text-purple-600">{videoFormatEarnings}</span> credits
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg px-4 py-2">
                      Total: {earnings} 💰
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {transactions.filter((t) => t.type === "earn").length > 0 ? (
                    <div className="space-y-3">
                      {transactions
                        .filter((t) => t.type === "earn")
                        .slice(0, 5)
                        .map((t, idx) => (
                          <motion.div
                            key={t._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.8 + idx * 0.05 }}
                            whileHover={{ x: 5 }}
                            className={`flex items-center justify-between rounded-lg border-2 p-4 shadow-sm hover:shadow-md transition-all ${
                              t.description?.includes("Video watched") || t.meta?.kind === "video_unlock"
                                ? "border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50"
                                : "border-green-200 bg-gradient-to-r from-green-50 to-emerald-50"
                            }`}
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{t.description}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                📅 {new Date(t.createdAt).toLocaleDateString()}
                                {t.description?.includes("Video watched") || t.meta?.kind === "video_unlock" ? (
                                  <span className="ml-2 text-purple-600 font-semibold">• Video Format</span>
                                ) : (
                                  <span className="ml-2 text-blue-600 font-semibold">• Live Session</span>
                                )}
                              </p>
                            </div>
                            <Badge className={`text-base px-3 py-1 ${
                              t.description?.includes("Video watched") || t.meta?.kind === "video_unlock"
                                ? "bg-purple-100 text-purple-700 border-purple-300"
                                : "bg-green-100 text-green-700 border-green-300"
                            }`}>
                              +{t.amount} 💰
                            </Badge>
                          </motion.div>
                        ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="text-5xl mb-3">💸</div>
                      <p className="text-slate-600">No earnings yet. Start teaching to earn credits!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}

        {/* Student Dashboard */}
        {!isTeacher && (
          <>
            {/* Booked Skills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <span className="text-2xl">🎓</span>
                      </div>
                      <CardTitle>My Booked Skills</CardTitle>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shadow-sm">
                      <Link to="/skills">Browse More</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {studentBookings.length > 0 ? (
                    <div className="space-y-3">
                      {studentBookings.slice(0, 5).map((booking, idx) => (
                        <motion.div
                          key={booking._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + idx * 0.05 }}
                          whileHover={{ x: 5, scale: 1.01 }}
                          className="rounded-xl border-2 border-slate-200 bg-gradient-to-r from-white to-slate-50 p-5 shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <p className="font-bold text-lg text-slate-900">{booking.skill?.title}</p>
                                <Badge className={`capitalize ${
                                  booking.status === "approved" ? "bg-green-100 text-green-700" :
                                  booking.status === "pending" ? "bg-amber-100 text-amber-700" :
                                  "bg-slate-100 text-slate-700"
                                }`}>
                                  {booking.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-600">
                                👨‍🏫 Teacher: <span className="font-semibold">{booking.teacher?.name}</span>
                              </p>
                              {booking.sessionDate && (
                                <p className="text-sm text-slate-500 mt-1">
                                  🕐 {new Date(booking.sessionDate).toLocaleString()}
                                </p>
                              )}
                            </div>
                            {booking.status === "approved" && (
                              <Button asChild size="sm" className="ml-4 bg-gradient-to-r from-blue-600 to-purple-600 shadow-md">
                                <Link to={`/video-call/${booking._id}`}>🎥 Join Call</Link>
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-12 text-center"
                    >
                      <div className="text-6xl mb-4">🔍</div>
                      <p className="text-slate-600 mb-4 text-lg">You haven't booked any skills yet.</p>
                      <Button asChild size="lg" className="shadow-lg">
                        <Link to="/skills">Browse Skills</Link>
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Upcoming Sessions */}
            {upcomingSessions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="border-2 border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <span className="text-2xl">📅</span>
                      </div>
                      <CardTitle>Upcoming Sessions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {upcomingSessions.slice(0, 5).map((booking, idx) => (
                        <motion.div
                          key={booking._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + idx * 0.05 }}
                          whileHover={{ x: 5, scale: 1.01 }}
                          className="flex items-center justify-between rounded-xl border-2 border-blue-200 bg-white p-4 shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="flex-1">
                            <p className="font-bold text-slate-900">{booking.skill?.title}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              With: <span className="font-semibold">{booking.teacher?.name}</span>
                            </p>
                            {booking.sessionDate && (
                              <p className="text-sm text-slate-500 mt-1">
                                🕐 {new Date(booking.sessionDate).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <Button asChild size="sm" className="ml-4 bg-gradient-to-r from-blue-600 to-purple-600 shadow-md">
                            <Link to={`/video-call/${booking._id}`}>🎥 Join Call</Link>
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Learning History */}
            {completedSessions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <span className="text-2xl">📜</span>
                      </div>
                      <CardTitle>Learning History</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {completedSessions.slice(0, 5).map((booking, idx) => (
                        <motion.div
                          key={booking._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + idx * 0.05 }}
                          whileHover={{ x: 5 }}
                          className="rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-900">{booking.skill?.title}</p>
                              <p className="text-sm text-slate-600 mt-1">
                                👨‍🏫 Teacher: <span className="font-semibold">{booking.teacher?.name}</span>
                              </p>
                              {booking.completedAt && (
                                <p className="text-sm text-slate-500 mt-1">
                                  ✅ Completed: {new Date(booking.completedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                              ✅ Completed
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}

        {/* Recent Activity (All Users) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">📊</span>
                  </div>
                  <CardTitle>Recent Activity</CardTitle>
                </div>
                <Button asChild variant="outline" size="sm" className="shadow-sm">
                  <Link to="/bookings">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {allBookings.length > 0 ? (
                <div className="space-y-3">
                  {allBookings.slice(0, 5).map((booking, idx) => (
                    <motion.div
                      key={booking._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9 + idx * 0.05 }}
                      whileHover={{ x: 5, scale: 1.01 }}
                    >
                      <BookingCard booking={booking} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
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

export default DashboardPage;
