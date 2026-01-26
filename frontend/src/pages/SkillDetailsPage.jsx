import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Alert } from "../components/Alert";

// Star Rating Component
const StarRating = ({ rating, size = "text-xl" }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`} className={`${size} text-yellow-400`}>★</span>
      ))}
      {hasHalfStar && <span className={`${size} text-yellow-400`}>☆</span>}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`} className={`${size} text-gray-300`}>★</span>
      ))}
    </div>
  );
};

const SkillDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").trim().replace(/\/$/, "");
  const [skill, setSkill] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [videoViews, setVideoViews] = useState(0);
  const [message, setMessage] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionDuration, setSessionDuration] = useState(60);
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [hasVideoAccess, setHasVideoAccess] = useState(false);
  const [checkingVideoAccess, setCheckingVideoAccess] = useState(false);
  const [videoActionLoading, setVideoActionLoading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [videoLoading, setVideoLoading] = useState(true);

  const fetchSkill = async () => {
    try {
      const { data: skillData } = await api.get(`/skills/${id}`);
      setSkill(skillData);
      
      if (skillData.mode === "offline") {
        // For offline videos, fetch view count instead of reviews
        try {
          const { data: viewsData } = await api.get(`/skills/${id}/video-views`);
          setVideoViews(viewsData?.views || 0);
        } catch {
          setVideoViews(0);
        }
        setReviews([]);
      } else {
        // For online skills, fetch reviews
        try {
          const { data: reviewData } = await api.get(`/reviews/skill/${id}`);
          setReviews(reviewData || []);
        } catch {
          setReviews([]);
        }
        setVideoViews(0);
      }
    } catch (err) {
      setError("Skill not found");
    }
  };

  useEffect(() => {
    fetchSkill();
  }, [id]);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !skill || skill.mode !== "offline" || !skill.videoUrl) return;
      setCheckingVideoAccess(true);
      try {
        const { data } = await api.get(`/skills/${id}/video-access`);
        setHasVideoAccess(!!data?.hasAccess);
      } catch {
        setHasVideoAccess(false);
      } finally {
        setCheckingVideoAccess(false);
      }
    };
    checkAccess();
  }, [user, skill, id]);

  const handleBook = async () => {
    setError("");
    setStatus("");
    setNotice("");
    if (!user) {
      navigate("/login");
      return;
    }
    
    // Validate required fields
    if (!sessionDate) {
      setError("Please select a preferred session date");
      return;
    }
    
    if (!sessionDuration || sessionDuration < 15 || sessionDuration > 480) {
      setError("Please enter a valid session duration (15-480 minutes)");
      return;
    }
    
    try {
      await api.post("/bookings", { 
        skillId: id, 
        message, 
        sessionDate: sessionDate,
        sessionDuration: sessionDuration
      });
      setMessage("");
      setSessionDate("");
      setSessionDuration(60);
      // Show large success message
      setNotice("Session booked successfully");
      // Clear notice after 8 seconds to give user time to see it
      setTimeout(() => setNotice(""), 8000);
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed");
    }
  };

  const handleUnlockVideo = async () => {
    setError("");
    setStatus("");
    if (!user) {
      navigate("/login");
      return;
    }
    setVideoActionLoading(true);
    try {
      await api.post(`/skills/${id}/unlock-video`);
      setHasVideoAccess(true);
      setStatus("Video unlocked! Credits transferred to the teacher.");
      // refresh user credits
      const me = await api.get("/auth/me");
      setUser(me.data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to unlock video");
    } finally {
      setVideoActionLoading(false);
    }
  };

  const handleDeleteVideo = async () => {
    if (!confirm("Delete this uploaded video? This cannot be undone.")) return;
    setError("");
    setStatus("");
    setVideoActionLoading(true);
    try {
      await api.delete(`/skills/${id}/video`);
      await fetchSkill();
      setStatus("Video deleted.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to delete video");
    } finally {
      setVideoActionLoading(false);
    }
  };

  if (!skill) {
    return (
      <PageLayout>
        <p className="text-sm text-slate-600">Loading skill...</p>
      </PageLayout>
    );
  }

  const teacherOverallRating = skill.owner?.averageRating || 0;
  const teacherReviewsCount = skill.owner?.reviewsCount || 0;
  const skillRating = skill.averageRating || 0;
  const skillReviewsCount = skill.reviewsCount || 0;
  const isOwner = user && String(user._id) === String(skill.owner?._id);
  const isOffline = skill.mode === "offline";
  const token = localStorage.getItem("token") || "";
  const streamUrl = token 
    ? `${apiBase}/skills/${id}/video-stream?token=${encodeURIComponent(token)}`
    : `${apiBase}/skills/${id}/video-stream`;

  return (
    <PageLayout>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge className="bg-brand-50 text-brand-700 border border-brand-100 shadow-sm">{skill.category}</Badge>
                <CardTitle className="mt-2 text-3xl font-bold text-slate-900">{skill.title}</CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  Mode: <span className="font-semibold">{skill.mode === "online" ? "Live Session" : skill.mode === "offline" ? "Video format" : skill.mode}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{skill.creditCost}</p>
                <p className="text-sm text-slate-500 font-medium">credits</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6 bg-gradient-to-br from-white to-slate-50">
            <p className="text-slate-700 text-base leading-relaxed">{skill.description}</p>

            {/* Offline video (if provided) */}
            {isOffline && skill.videoUrl && (
              <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-md hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Offline video</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isOwner
                        ? "Preview your uploaded video"
                        : hasVideoAccess
                          ? "Unlocked — you can watch now"
                          : "Locked — unlock with credits to watch"}
                    </p>
                  </div>
                  <Badge className="bg-purple-50 text-purple-700 border border-purple-200">🎬 Video</Badge>
                </div>
                {skill.thumbnailUrl && !hasVideoAccess && !isOwner && (
                  <div className="mt-3">
                    <img
                      src={`${apiBase.replace(/\/api\/?$/, "")}${skill.thumbnailUrl}`}
                      alt={skill.title}
                      className="w-full rounded-xl border border-slate-200 object-cover"
                      style={{ maxHeight: "300px" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div className="mt-3">
                  {(isOwner || hasVideoAccess) ? (
                    <div className="relative">
                      {videoError && (
                        <div className="mb-2 p-3 rounded-lg bg-red-50 border border-red-200">
                          <p className="text-sm text-red-700 font-semibold">Video Error</p>
                          <p className="text-xs text-red-600 mt-1">{videoError}</p>
                          <button
                            onClick={() => {
                              setVideoError("");
                              setVideoLoading(true);
                              const videoEl = document.querySelector(`video[data-skill-id="${id}"]`);
                              if (videoEl) {
                                videoEl.load();
                              }
                            }}
                            className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      {videoLoading && !videoError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black rounded-xl">
                          <div className="text-white text-sm">Loading video...</div>
                        </div>
                      )}
                      <video
                        data-skill-id={id}
                        controls
                        preload="metadata"
                        className="w-full rounded-xl border border-slate-200 bg-black"
                        src={streamUrl}
                        poster={skill.thumbnailUrl ? `${apiBase.replace(/\/api\/?$/, "")}${skill.thumbnailUrl}` : undefined}
                        onLoadedData={() => {
                          setVideoLoading(false);
                          setVideoError("");
                          console.log("Video loaded successfully:", streamUrl);
                        }}
                        onCanPlay={() => {
                          setVideoLoading(false);
                        }}
                        onError={(e) => {
                          setVideoLoading(false);
                          const videoEl = e.target;
                          let errorMsg = "Failed to load video";
                          if (videoEl.error) {
                            switch (videoEl.error.code) {
                              case videoEl.error.MEDIA_ERR_ABORTED:
                                errorMsg = "Video loading aborted. Please check your connection.";
                                break;
                              case videoEl.error.MEDIA_ERR_NETWORK:
                                errorMsg = "Network error. Please check your connection and try again.";
                                break;
                              case videoEl.error.MEDIA_ERR_DECODE:
                                errorMsg = "Video decoding error. The file may be corrupted.";
                                break;
                              case videoEl.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                                errorMsg = "Video format not supported by your browser.";
                                break;
                              default:
                                errorMsg = `Video error (code: ${videoEl.error.code}). Please try again.`;
                            }
                          } else {
                            errorMsg = "Unable to load video. Please check if you have access and the file exists.";
                          }
                          setVideoError(errorMsg);
                          console.error("Video error:", {
                            error: videoEl.error,
                            src: streamUrl,
                            networkState: videoEl.networkState,
                            readyState: videoEl.readyState,
                          });
                        }}
                        onLoadStart={() => {
                          setVideoLoading(true);
                          setVideoError("");
                        }}
                        onStalled={() => {
                          console.warn("Video stalled, may be buffering...");
                        }}
                      />
                    </div>
                  ) : (
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white">
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.18),transparent_45%)]" />
                      <div className="relative">
                        <p className="text-lg font-bold">🔒 Video locked</p>
                        <p className="mt-1 text-sm text-white/80">
                          Unlock to watch this offline lesson video.
                        </p>
                        <div className="mt-4">
                          <Button
                            type="button"
                            className="bg-white text-slate-900 hover:bg-white/90"
                            disabled={checkingVideoAccess || videoActionLoading}
                            onClick={handleUnlockVideo}
                          >
                            {checkingVideoAccess ? "Checking..." : videoActionLoading ? "Unlocking..." : `Unlock for ${skill.creditCost} credits`}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {isOwner && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-2"
                      disabled={videoActionLoading}
                      onClick={handleDeleteVideo}
                    >
                      Delete video
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Rating/Views Display Section */}
            {isOffline ? (
              <div className="space-y-4">
                {/* Video Views for Offline Skills */}
                <div className="rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-5 border-2 border-indigo-200 shadow-md hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl font-bold">👁️</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Video Views</p>
                        <p className="text-xs text-slate-500 mt-0.5">Total number of times this video has been unlocked</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {videoViews}
                      </span>
                      <span className="text-xl text-slate-400">views</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    <span className="font-semibold">{skill.owner?.name}</span> · {videoViews === 1 ? 'view' : 'views'} total
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Teacher Overall Rating */}
                <div className="rounded-xl bg-gradient-to-br from-purple-50 via-purple-50 to-pink-50 p-5 border-2 border-purple-200 shadow-md hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl font-bold">👨‍🏫</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Teacher Overall Rating</p>
                        <p className="text-xs text-slate-500 mt-0.5">Average across all sessions</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {teacherOverallRating.toFixed(1)}
                      </span>
                      <span className="text-xl text-slate-400">/ 5</span>
                    </div>
                    <StarRating rating={teacherOverallRating} size="text-2xl" />
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    <span className="font-semibold">{skill.owner?.name}</span> · {teacherReviewsCount} total {teacherReviewsCount === 1 ? 'review' : 'reviews'}
                  </p>
                </div>

                {/* Skill Specific Rating */}
                <div className="rounded-xl bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-5 border-2 border-blue-200 shadow-md hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl font-bold">⭐</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">This Skill Rating</p>
                        <p className="text-xs text-slate-500 mt-0.5">Rating for this specific skill</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                        {skillRating.toFixed(1)}
                      </span>
                      <span className="text-xl text-slate-400">/ 5</span>
                    </div>
                    <StarRating rating={skillRating} size="text-2xl" />
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    {skillReviewsCount} {skillReviewsCount === 1 ? 'review' : 'reviews'} for this skill
                  </p>
                </div>
            </div>
            )}

            {isOwner && (
              <Button variant="outline" asChild className="mt-4 hover:bg-blue-50 border-2">
                <Link to={`/skills/${id}/edit`}>Edit skill</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {!isOffline ? (
          <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b-2 border-slate-200">
              <CardTitle className="text-xl font-bold text-slate-900">Book this skill</CardTitle>
              <p className="text-sm text-slate-600 mt-1">Credits will be held until completion.</p>
              <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⭐</span>
                  <span className="text-sm font-semibold text-slate-700">
                    Teacher has <span className="text-blue-600 font-bold">{teacherReviewsCount}</span> total {teacherReviewsCount === 1 ? 'review' : 'reviews'} across all sessions
                  </span>
                </div>
              </div>
          </CardHeader>
            <CardContent className="space-y-3 pt-6 bg-gradient-to-br from-white to-slate-50">
            {notice && (
              <div className="mb-6 p-8 rounded-2xl bg-gradient-to-r from-green-100 via-emerald-100 to-green-100 border-4 border-green-400 shadow-2xl animate-pulse">
                <div className="text-center">
                  <div className="text-7xl mb-4 animate-bounce">✅</div>
                  <h2 className="text-4xl font-bold text-green-800 mb-3">Session Booked Successfully!</h2>
                  <p className="text-xl text-green-700 font-semibold">Your booking request has been submitted</p>
                  <p className="text-lg text-green-600 mt-2">Wait for teacher approval</p>
                </div>
              </div>
            )}
            {status && !notice && <Alert variant="success">{status}</Alert>}
            {error && <Alert variant="error">{error}</Alert>}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Preferred session date <span className="text-red-500">*</span>
                </label>
                <Input 
                  type="datetime-local" 
                  value={sessionDate} 
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                  className={!sessionDate ? "border-red-300 focus:border-red-500" : ""}
                />
                {!sessionDate && (
                  <p className="text-xs text-red-500">Session date is required</p>
                )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                  Session duration (minutes) <span className="text-red-500">*</span>
                <span className="text-xs text-slate-500 ml-2">15-480 minutes</span>
              </label>
              <Input 
                type="number" 
                min={15} 
                max={480} 
                step={15}
                value={sessionDuration} 
                onChange={(e) => setSessionDuration(Number(e.target.value))}
                placeholder="60"
                  required
                  className={(!sessionDuration || sessionDuration < 15 || sessionDuration > 480) ? "border-red-300 focus:border-red-500" : ""}
              />
              <p className="text-xs text-slate-500">
                  Minimum: 15 min, Maximum: 8 hours (480 min). Recommended: 60 minutes
              </p>
                {(!sessionDuration || sessionDuration < 15 || sessionDuration > 480) && (
                  <p className="text-xs text-red-500">Please enter a valid duration between 15 and 480 minutes</p>
                )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Message to teacher</label>
              <Textarea placeholder="Share your goals or availability" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
              <Button 
                className="w-full" 
                onClick={handleBook} 
                disabled={
                  (user && String(user._id) === String(skill.owner?._id)) || 
                  !sessionDate || 
                  !sessionDuration || 
                  sessionDuration < 15 || 
                  sessionDuration > 480
                }
              >
                {user && String(user._id) === String(skill.owner?._id) 
                  ? "You own this skill" 
                  : !sessionDate || !sessionDuration 
                    ? "Please fill all required fields" 
                    : "Request booking"}
            </Button>
            {!user && (
              <p className="text-center text-sm text-slate-500">
                Please <Link className="text-brand-600" to="/login">login</Link> to book.
              </p>
            )}
          </CardContent>
        </Card>
        ) : (
          <Card className="border-2 border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b-2 border-slate-200">
              <CardTitle className="text-xl font-bold text-slate-900">Watch offline video</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                No booking or approval needed. Unlock transfers credits instantly.
              </p>
              <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⭐</span>
                  <span className="text-sm font-semibold text-slate-700">
                    Teacher has <span className="text-blue-600 font-bold">{teacherReviewsCount}</span> total {teacherReviewsCount === 1 ? 'review' : 'reviews'} across all sessions
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-6 bg-gradient-to-br from-white to-slate-50">
              {status && <Alert variant="success">{status}</Alert>}
              {error && <Alert variant="error">{error}</Alert>}

              {!skill.videoUrl ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                  No video uploaded yet.
                </div>
              ) : isOwner ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                  This is your skill. Learners will unlock this video for <span className="font-bold">{skill.creditCost}</span> credits.
                </div>
              ) : hasVideoAccess ? (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  ✅ Unlocked. You can watch the video on the left.
                </div>
              ) : (
                <Button className="w-full" onClick={handleUnlockVideo} disabled={videoActionLoading || checkingVideoAccess}>
                  {checkingVideoAccess ? "Checking..." : videoActionLoading ? "Unlocking..." : `Unlock video for ${skill.creditCost} credits`}
                </Button>
              )}

              {!user && (
                <p className="text-center text-sm text-slate-500">
                  Please <Link className="text-brand-600" to="/login">login</Link> to unlock.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {!isOffline && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">Session Reviews</h2>
            <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 px-3 py-1">
              {reviews.length} {reviews.length === 1 ? 'Session' : 'Sessions'}
            </Badge>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
          {reviews.map((r) => (
            <Card key={r._id} className="border-2 border-slate-200 hover:border-blue-300 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
              <CardContent className="p-5 bg-gradient-to-br from-white to-slate-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white font-bold shadow-md group-hover:scale-110 transition-transform">
                      {r.learner?.name?.charAt(0)?.toUpperCase() || 'L'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{r.learner?.name}</p>
                      <p className="text-xs text-slate-500">
                        Session · {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        }) : 'Recent session'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Session Rating Display */}
                <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Session Rating:</span>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-0 font-bold text-base px-3 py-1">
                        {r.rating} / 5
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2">
                    <StarRating rating={r.rating} size="text-lg" />
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {r.comment || <span className="italic text-slate-400">No comment provided.</span>}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
            {!reviews.length && (
              <div className="col-span-full text-center py-12 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-dashed border-slate-300">
                <p className="text-lg text-slate-600 font-medium">No session reviews yet.</p>
                <p className="text-sm text-slate-500 mt-1">Be the first to review this skill after a session!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default SkillDetailsPage;

