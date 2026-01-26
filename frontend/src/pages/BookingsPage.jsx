import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { BookingCard } from "../components/BookingCard";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { api } from "../services/api";
import { Alert } from "../components/Alert";
import { useAuth } from "../context/AuthContext";

// Countdown Timer Component
const SessionCountdown = ({ sessionEndTime, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!sessionEndTime) return;

    const updateTimer = () => {
      const now = new Date();
      const end = new Date(sessionEndTime);
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft("Session ended");
        if (onComplete) onComplete();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [sessionEndTime, onComplete]);

  if (!sessionEndTime) return null;

  const now = new Date();
  const end = new Date(sessionEndTime);
  if (now >= end) return <span className="text-xs text-red-600 font-semibold">Session ended</span>;

  return (
    <span className="text-xs text-blue-600 font-semibold">
      ⏱️ Time left: {timeLeft}
    </span>
  );
};

const BookingsPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState({}); // Track reviews by booking ID
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [feedback, setFeedback] = useState({});
  const [activeTab, setActiveTab] = useState(() => {
    // Initialize from URL query parameter or default to "pending"
    const tabFromUrl = searchParams.get("tab");
    return tabFromUrl && ["pending", "accepted", "rejected", "completed", "videoUnlocks"].includes(tabFromUrl) 
      ? tabFromUrl 
      : "pending";
  });
  const [videoUnlocks, setVideoUnlocks] = useState([]);
  const [videoViewCounts, setVideoViewCounts] = useState({});

  // Update active tab when URL query parameter changes
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && ["pending", "accepted", "rejected", "completed", "videoUnlocks"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const fetchBookings = async () => {
    setError("");
    try {
      const { data } = await api.get("/bookings/mine");
      setBookings(data);
      
      // Fetch reviews for completed bookings to check if already reviewed
      const completedBookings = data.filter(b => 
        b.status === "completed" && String(b.learner?._id || b.learner) === String(user?._id)
      );
      const reviewPromises = completedBookings.map(async (booking) => {
        try {
          const reviewResponse = await api.get(`/reviews/booking/${booking._id}`);
          return { bookingId: booking._id, review: reviewResponse.data };
        } catch (err) {
          // 404 means no review exists, which is fine
          if (err.response?.status === 404) {
            return { bookingId: booking._id, review: null };
          }
          return { bookingId: booking._id, review: null };
        }
      });
      
      const reviewResults = await Promise.all(reviewPromises);
      const reviewsMap = {};
      reviewResults.forEach(({ bookingId, review }) => {
        if (review) {
          reviewsMap[bookingId] = review;
        }
      });
      setReviews(reviewsMap);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load bookings");
    }
  };

  const fetchVideoUnlocks = async () => {
    setError("");
    try {
      const { data } = await api.get("/skills/video-unlocks");
      setVideoUnlocks(data);
      
      // Fetch view counts for each unlocked video
      const viewCountPromises = data.map(async (unlock) => {
        if (!unlock.skill?._id) return { skillId: null, views: 0 };
        try {
          const { data: viewsData } = await api.get(`/skills/${unlock.skill._id}/video-views`);
          return { skillId: unlock.skill._id, views: viewsData?.views || 0 };
        } catch {
          return { skillId: unlock.skill._id, views: 0 };
        }
      });
      const viewCountResults = await Promise.all(viewCountPromises);
      const countsMap = {};
      viewCountResults.forEach(({ skillId, views }) => {
        if (skillId) {
          countsMap[skillId] = views;
        }
      });
      setVideoViewCounts(countsMap);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load video unlocks");
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchVideoUnlocks();
  }, []);

  // Auto-complete sessions that have ended
  useEffect(() => {
    if (!user || bookings.length === 0) return;

    const checkAndCompleteSessions = async () => {
      const now = new Date();
      const endedSessions = bookings.filter(
        (b) =>
          b.status === "approved" &&
          b.sessionEndTime &&
          new Date(b.sessionEndTime) <= now &&
          (String(b.teacher?._id || b.teacher) === String(user?._id) ||
            String(b.learner?._id || b.learner) === String(user?._id))
      );

      if (endedSessions.length > 0) {
        for (const booking of endedSessions) {
          try {
            await api.post(`/bookings/${booking._id}/complete`);
          } catch (err) {
            // Ignore errors - session might already be completed or other issue
            console.error("Failed to auto-complete session:", err);
          }
        }
        // Refresh bookings after completion
        await fetchBookings();
      }
    };

    // Check every 30 seconds for ended sessions
    const interval = setInterval(checkAndCompleteSessions, 30000);
    checkAndCompleteSessions(); // Run immediately

    return () => clearInterval(interval);
  }, [bookings.length, user?._id]); // Only depend on length and user ID to avoid infinite loops

  const act = async (id, action) => {
    try {
      if (action === "complete") {
        await api.post(`/bookings/${id}/complete`);
      } else if (action === "delete") {
        await api.delete(`/bookings/${id}`);
        setNotice("Booking deleted successfully");
        setTimeout(() => setNotice(""), 3000);
      } else {
        await api.post(`/bookings/${id}/${action}`);
      }
      fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || "Action failed");
    }
  };

  const submitReview = async (bookingId) => {
    setError("");
    setNotice("");
    const payload = feedback[bookingId];
    if (!payload?.rating) {
      setError("Please add a rating");
      return;
    }
    try {
      const reviewData = await api.post("/reviews", { bookingId, rating: Number(payload.rating), comment: payload.comment });
      setNotice("Review submitted successfully!");
      setFeedback((prev) => ({ ...prev, [bookingId]: { rating: "", comment: "" } }));
      // Mark review as submitted
      setReviews((prev) => ({ ...prev, [bookingId]: reviewData.data }));
      // Refresh bookings to get updated data
      await fetchBookings();
    } catch (err) {
      if (err.response?.data?.message?.includes("already submitted")) {
        setError("You have already submitted a review for this session.");
        // Refresh to get the existing review
        await fetchBookings();
      } else {
        setError(err.response?.data?.message || "Review failed");
      }
    }
  };

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "pending") {
      return b.status === "pending";
    } else if (activeTab === "accepted") {
      return b.status === "approved";
    } else if (activeTab === "rejected") {
      return b.status === "rejected";
    } else if (activeTab === "completed") {
      return b.status === "completed";
    } else if (activeTab === "videoUnlocks") {
      return false; // Video unlocks are shown separately
    }
    return false; // No default tab
  });

  // Count bookings by status (only active sessions, not completed)
  const pendingCount = bookings.filter(b => b.status === "pending").length;
  const acceptedCount = bookings.filter(b => b.status === "approved").length;
  const rejectedCount = bookings.filter(b => b.status === "rejected").length;
  // Don't count completed sessions - they're not active

  return (
    <PageLayout>
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-brand-600">Bookings</p>
          <h1 className="text-3xl font-bold text-slate-900">Manage your sessions</h1>
        </div>
        {notice && <Alert variant="success">{notice}</Alert>}
        {error && <Alert variant="error">{error}</Alert>}
        
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b-2 border-slate-200 pb-2">
          <button
            onClick={() => {
              setActiveTab("pending");
              setSearchParams({ tab: "pending" });
            }}
            className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 ${
              activeTab === "pending"
                ? "border-amber-600 text-amber-600 bg-amber-50"
                : "border-transparent text-slate-600 hover:text-amber-600"
            }`}
          >
            ⏳ Pending Sessions
            {pendingCount > 0 && (
              <Badge className="ml-2 bg-amber-600 text-white">{pendingCount}</Badge>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("accepted");
              setSearchParams({ tab: "accepted" });
            }}
            className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 ${
              activeTab === "accepted"
                ? "border-blue-600 text-blue-600 bg-blue-50"
                : "border-transparent text-slate-600 hover:text-blue-600"
            }`}
          >
            ✅ Accepted Sessions
            {acceptedCount > 0 && (
              <Badge className="ml-2 bg-blue-600 text-white">{acceptedCount}</Badge>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("rejected");
              setSearchParams({ tab: "rejected" });
            }}
            className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 ${
              activeTab === "rejected"
                ? "border-red-600 text-red-600 bg-red-50"
                : "border-transparent text-slate-600 hover:text-red-600"
            }`}
          >
            ❌ Rejected Sessions
            {rejectedCount > 0 && (
              <Badge className="ml-2 bg-red-600 text-white">{rejectedCount}</Badge>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("completed");
              setSearchParams({ tab: "completed" });
            }}
            className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 ${
              activeTab === "completed"
                ? "border-green-600 text-green-600 bg-green-50"
                : "border-transparent text-slate-600 hover:text-green-600"
            }`}
          >
            🎉 Completed Sessions
          </button>
          <button
            onClick={() => {
              setActiveTab("videoUnlocks");
              setSearchParams({ tab: "videoUnlocks" });
            }}
            className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 ${
              activeTab === "videoUnlocks"
                ? "border-indigo-600 text-indigo-600 bg-indigo-50"
                : "border-transparent text-slate-600 hover:text-indigo-600"
            }`}
          >
            🎬 Offline Videos
            {videoUnlocks.length > 0 && (
              <Badge className="ml-2 bg-indigo-600 text-white">{videoUnlocks.length}</Badge>
            )}
          </button>
        </div>

        <div className="space-y-4">
          {activeTab === "videoUnlocks" ? (
            videoUnlocks.length > 0 ? (
              videoUnlocks.map((unlock) => {
                const viewCount = videoViewCounts[unlock.skill?._id] || 0;
                return (
                  <div key={unlock._id} className="space-y-3">
                    <div className="rounded-lg border-2 border-indigo-200 bg-white p-4 shadow-md hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-indigo-100 text-indigo-700 border border-indigo-300">🎬 Offline Video</Badge>
                            <span className="text-xs text-slate-500">
                              Unlocked {new Date(unlock.unlockedAt || unlock.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-900 mb-2">
                            {unlock.skill?.title || "Skill"}
                          </h3>
                          <div className="flex items-center gap-4 text-sm mb-2">
                            <span className="text-slate-600 font-semibold">
                              👁️ Views: <span className="text-indigo-600">{viewCount}</span>
                            </span>
                            <span className="text-slate-600">
                              👨‍🏫 Teacher: <span className="font-semibold">{unlock.teacher?.name}</span>
                            </span>
                            <span className="text-slate-600">
                              💰 Cost: <span className="font-semibold">{unlock.creditCost} credits</span>
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                            {unlock.skill?.description || ""}
                          </p>
                        </div>
                        {unlock.skill?.thumbnailUrl && (
                          <div className="flex-shrink-0">
                            <img
                              src={`${(import.meta.env.VITE_API_URL || "http://localhost:5000/api").trim().replace(/\/api\/?$/, "")}${unlock.skill.thumbnailUrl}`}
                              alt={unlock.skill.title}
                              className="w-24 h-24 rounded-lg object-cover border border-slate-200"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <Link to={`/skills/${unlock.skill?._id}`}>
                          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            Watch Video →
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-dashed border-slate-300">
                <div className="text-5xl mb-3">🎬</div>
                <p className="text-lg text-slate-600 font-medium">No offline videos unlocked yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Unlock offline videos from the skills marketplace to watch them here
                </p>
              </div>
            )
          ) : filteredBookings.length > 0 ? (
            filteredBookings.map((b) => (
            <div key={b._id} className="space-y-3">
              <BookingCard booking={b} />
              <div className="flex flex-wrap gap-2">
                {String(b.teacher?._id || b.teacher) === String(user?._id) && b.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => act(b._id, "approve")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => act(b._id, "reject")}>
                      Reject
                    </Button>
                  </>
                )}
                {String(b.learner?._id || b.learner) === String(user?._id) && b.status === "pending" && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to cancel this booking? Your credits will be refunded.")) {
                        act(b._id, "cancel");
                      }
                    }}
                  >
                    Cancel Booking
                  </Button>
                )}
                {["approved"].includes(b.status) &&
                  [b.teacher?._id, b.learner?._id, b.teacher, b.learner].some((id) => String(id) === String(user?._id)) && (
                  <>
                    {(() => {
                      const now = new Date();
                      const sessionStart = b.sessionStartTime ? new Date(b.sessionStartTime) : null;
                      const sessionEnd = b.sessionEndTime ? new Date(b.sessionEndTime) : null;
                      const isSessionActive = sessionStart && sessionEnd && now >= sessionStart && now < sessionEnd;
                      const hasSessionStarted = sessionStart && now >= sessionStart;
                      const hasSessionEnded = sessionEnd && now >= sessionEnd;

                      if (isSessionActive) {
                        return (
                          <div className="flex flex-wrap items-center gap-2">
                            <Link to={`/video-call/${b._id}`}>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                                🎥 Join Video Call
                              </Button>
                            </Link>
                            <SessionCountdown
                              sessionEndTime={b.sessionEndTime}
                              onComplete={async () => {
                                // Auto-complete when timer ends
                                try {
                                  await act(b._id, "complete");
                                } catch (err) {
                                  // Session might already be completed
                                }
                              }}
                            />
                          </div>
                        );
                      } else if (sessionStart && !hasSessionStarted) {
                        return (
                          <span className="text-xs text-amber-600 font-semibold">
                            ⏰ Session starts: {new Date(sessionStart).toLocaleString()}
                          </span>
                        );
                      } else if (hasSessionEnded) {
                        return (
                          <span className="text-xs text-green-600 font-semibold">
                            ✅ Session completed automatically
                          </span>
                        );
                      } else {
                        return (
                          <span className="text-xs text-slate-500 self-center">
                            {b.sessionEndTime ? `Session ends: ${new Date(b.sessionEndTime).toLocaleString()}` : "Session in progress"}
                          </span>
                        );
                      }
                    })()}
                  </>
                )}
              </div>
              {/* Delete button for teachers on completed, approved, or rejected sessions */}
              {String(b.teacher?._id || b.teacher) === String(user?._id) && 
               ["completed", "approved", "rejected"].includes(b.status) && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete this ${b.status} booking? This action cannot be undone.`)) {
                        act(b._id, "delete");
                      }
                    }}
                  >
                    🗑️ Delete Booking
                  </Button>
                </div>
              )}
              {b.status === "completed" && String(b.learner?._id || b.learner) === String(user?._id) && (
                <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-md">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">⭐</span>
                    <p className="text-lg font-bold text-slate-900">Rate This Session</p>
                  </div>
                  {reviews[b._id] ? (
                    <div className="space-y-3">
                      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">✓</span>
                          <p className="text-base font-semibold text-green-700">Review Submitted</p>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-semibold text-slate-700">Your Rating:</span>
                          <span className="text-2xl font-bold text-green-700">{reviews[b._id].rating} / 5</span>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={`text-xl ${i < reviews[b._id].rating ? "text-yellow-400" : "text-gray-300"}`}>
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                        {reviews[b._id].comment && (
                          <p className="text-sm text-slate-700 italic mt-2">"{reviews[b._id].comment}"</p>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                          Submitted on {new Date(reviews[b._id].createdAt || reviews[b._id].timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-600 mb-3">Share your experience with this session</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Rating (1-5 stars)</label>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={feedback[b._id]?.rating || ""}
                            onChange={(e) =>
                              setFeedback((prev) => ({
                                ...prev,
                                [b._id]: { ...prev[b._id], rating: e.target.value },
                              }))
                            }
                            className="h-12 w-full rounded-lg border-2 border-slate-300 px-3 text-base font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            placeholder="Enter rating (1-5)"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Comment (optional)</label>
                          <textarea
                            value={feedback[b._id]?.comment || ""}
                            onChange={(e) =>
                              setFeedback((prev) => ({
                                ...prev,
                                [b._id]: { ...prev[b._id], comment: e.target.value },
                              }))
                            }
                            className="w-full rounded-lg border-2 border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            placeholder="Share your thoughts about this session..."
                            rows={3}
                          />
                        </div>
                        <Button 
                          size="lg" 
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                          onClick={() => submitReview(b._id)}
                          disabled={!feedback[b._id]?.rating}
                        >
                          Submit Rating
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            ))
          ) : (
            <div className="text-center py-12 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-dashed border-slate-300">
              <div className="text-5xl mb-3">
                {activeTab === "pending" ? "⏳" : 
                 activeTab === "accepted" ? "✅" : 
                 activeTab === "rejected" ? "❌" : 
                 activeTab === "completed" ? "🎉" : "📭"}
              </div>
              <p className="text-lg text-slate-600 font-medium">
                {activeTab === "pending" 
                  ? "No pending sessions" 
                  : activeTab === "accepted" 
                    ? "No accepted sessions" 
                    : activeTab === "rejected" 
                      ? "No rejected sessions" 
                      : activeTab === "completed" 
                        ? "No completed sessions yet" 
                        : activeTab === "videoUnlocks"
                          ? "No offline videos unlocked"
                          : "No bookings yet"}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {activeTab === "pending" 
                  ? "Pending session requests will appear here" 
                  : activeTab === "accepted" 
                    ? "Accepted sessions will appear here" 
                    : activeTab === "rejected" 
                      ? "Rejected session requests will appear here" 
                      : activeTab === "completed" 
                        ? "Completed sessions will appear here after you finish learning" 
                        : activeTab === "videoUnlocks"
                          ? "Unlock offline videos from the skills marketplace"
                          : "Start by booking a skill to get started!"}
              </p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default BookingsPage;

