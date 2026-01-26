import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Alert } from "../components/Alert";

// Star Rating Display Component
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

const RatingsPage = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // "all", "my", "received"

  useEffect(() => {
    fetchReviews();
  }, [filter, user]);

  const fetchReviews = async () => {
    setLoading(true);
    setError("");
    try {
      let endpoint = "/reviews/all";
      if (filter === "my") {
        endpoint = "/reviews/mine";
      } else if (filter === "received") {
        // For teachers - reviews on their skills
        const { data: allReviews } = await api.get("/reviews/all");
        const filtered = allReviews.filter(
          (r) => String(r.teacher?._id || r.teacher) === String(user?._id)
        );
        setReviews(filtered);
        setLoading(false);
        return;
      }
      const { data } = await api.get(endpoint);
      setReviews(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load ratings");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <p className="text-slate-600">Loading ratings...</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-brand-600">Ratings</p>
          <h1 className="text-3xl font-bold text-slate-900">All Ratings & Reviews</h1>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b-2 border-slate-200 pb-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 ${
              filter === "all"
                ? "border-blue-600 text-blue-600 bg-blue-50"
                : "border-transparent text-slate-600 hover:text-blue-600"
            }`}
          >
            🌟 All Ratings
            {reviews.length > 0 && (
              <Badge className="ml-2 bg-blue-600 text-white">{reviews.length}</Badge>
            )}
          </button>
          <button
            onClick={() => setFilter("my")}
            className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 ${
              filter === "my"
                ? "border-green-600 text-green-600 bg-green-50"
                : "border-transparent text-slate-600 hover:text-green-600"
            }`}
          >
            ✍️ My Reviews
            {filter === "my" && reviews.length > 0 && (
              <Badge className="ml-2 bg-green-600 text-white">{reviews.length}</Badge>
            )}
          </button>
          {user && (
            <button
              onClick={() => setFilter("received")}
              className={`px-4 py-2 font-semibold text-sm transition-all border-b-2 ${
                filter === "received"
                  ? "border-purple-600 text-purple-600 bg-purple-50"
                  : "border-transparent text-slate-600 hover:text-purple-600"
              }`}
            >
              📥 Received Reviews
              {filter === "received" && reviews.length > 0 && (
                <Badge className="ml-2 bg-purple-600 text-white">{reviews.length}</Badge>
              )}
            </button>
          )}
        </div>

        {/* Ratings List */}
        <div className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <Card key={review._id} className="border-2 border-slate-200 hover:border-blue-300 shadow-md hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white font-bold shadow-md">
                          {review.learner?.name?.charAt(0)?.toUpperCase() || "L"}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{review.learner?.name || "Learner"}</CardTitle>
                          <p className="text-sm text-slate-500">
                            Reviewed {review.skill?.title || "Skill"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-bold text-blue-600">{review.rating}</span>
                        <span className="text-slate-400">/ 5</span>
                      </div>
                      <StarRating rating={review.rating} size="text-lg" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {review.comment && (
                    <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                      <p className="text-sm text-slate-700 italic">"{review.comment}"</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>👨‍🏫 Teacher: <span className="font-semibold">{review.teacher?.name || "Unknown"}</span></span>
                    <span>📚 Skill: <Link to={`/skills/${review.skill?._id}`} className="font-semibold text-blue-600 hover:text-blue-700">{review.skill?.title || "Unknown"}</Link></span>
                    {review.booking?.sessionDate && (
                      <span>📅 {new Date(review.booking.sessionDate).toLocaleDateString()}</span>
                    )}
                    <span>🕐 {new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-dashed border-slate-300">
              <div className="text-5xl mb-3">⭐</div>
              <p className="text-lg text-slate-600 font-medium">
                {filter === "my" 
                  ? "You haven't submitted any ratings yet" 
                  : filter === "received"
                    ? "No reviews received yet"
                    : "No ratings found"}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {filter === "my"
                  ? "Complete a session to leave a rating"
                  : filter === "received"
                    ? "Ratings from learners will appear here"
                    : "Ratings will appear here once users start reviewing sessions"}
              </p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default RatingsPage;
