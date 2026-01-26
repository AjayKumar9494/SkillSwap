import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "../components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Alert } from "../components/Alert";
import { api } from "../services/api";

const SkillFormPage = ({ editMode = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const apiOrigin = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").trim().replace(/\/api\/?$/, "");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    mode: "online",
    creditCost: 1,
    videoUrl: "",
    thumbnailUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("details"); // details | offlineVideo

  const [videoUploading, setVideoUploading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState("");
  const [localVideoPreviewUrl, setLocalVideoPreviewUrl] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState("");

  useEffect(() => {
    if (editMode && id) {
      api
        .get(`/skills/${id}`)
        .then(({ data }) => {
          setForm({
            title: data.title,
            description: data.description,
            category: data.category,
            mode: data.mode,
            location: data.location || "",
            creditCost: data.creditCost,
            videoUrl: data.videoUrl || "",
          });
        })
        .catch(() => setError("Skill not found"));
    }
  }, [editMode, id]);

  useEffect(() => {
    return () => {
      if (localVideoPreviewUrl) URL.revokeObjectURL(localVideoPreviewUrl);
    };
  }, [localVideoPreviewUrl]);

  const handleChange = (e) => {
    const next = { ...form, [e.target.name]: e.target.value };
    // If teacher switches away from offline, hide video tab (keep url but not shown)
    if (e.target.name === "mode") {
      setActiveTab(e.target.value === "offline" ? "offlineVideo" : "details");
      setVideoError("");
      setVideoProgress(0);
    }
    setForm(next);
  };

  const handleVideoUpload = async (file) => {
    if (!file) return;
    setVideoError("");
    setVideoUploading(true);
    setVideoProgress(0);
    try {
      // Immediate local preview (even before upload finishes)
      if (localVideoPreviewUrl) URL.revokeObjectURL(localVideoPreviewUrl);
      setLocalVideoPreviewUrl(URL.createObjectURL(file));
    } catch {
      // ignore preview errors; upload still proceeds
    }

    try {
      const formData = new FormData();
      formData.append("video", file);

      const { data } = await api.post("/uploads/video", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const pct = Math.round((evt.loaded * 100) / evt.total);
          setVideoProgress(Math.min(100, Math.max(0, pct)));
        },
      });

      const url = data?.url || "";
      if (!url) throw new Error("Upload failed");
      setForm((prev) => ({ ...prev, videoUrl: url }));
      setVideoProgress(100);
    } catch (err) {
      setVideoError(err.response?.data?.message || err.message || "Video upload failed");
      setVideoProgress(0);
    } finally {
      setVideoUploading(false);
    }
  };

  const handleThumbnailUpload = async (file) => {
    if (!file) return;
    setThumbnailError("");
    setThumbnailUploading(true);

    try {
      const formData = new FormData();
      formData.append("thumbnail", file);

      const { data } = await api.post("/uploads/thumbnail", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const url = data?.url || "";
      if (!url) throw new Error("Upload failed");
      setForm((prev) => ({ ...prev, thumbnailUrl: url }));
    } catch (err) {
      setThumbnailError(err.response?.data?.message || err.message || "Thumbnail upload failed");
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      if (form.mode === "offline" && !form.videoUrl) {
        setActiveTab("offlineVideo");
        setError("Please upload a video for offline mode before saving.");
        return;
      }
      if (editMode) {
        await api.put(`/skills/${id}`, form);
        setSuccess("Skill updated");
      } else {
        await api.post("/skills", form);
        setSuccess("Skill created");
        setForm({ title: "", description: "", category: "", mode: "online", creditCost: 1, videoUrl: "", thumbnailUrl: "" });
      }
      navigate("/skills");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>{editMode ? "Edit skill" : "Create a new skill"}</CardTitle>
            <p className="text-sm text-slate-500">Describe what you can teach or want to list.</p>
          </CardHeader>
          <CardContent>
            {error && <Alert variant="error">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
            {/* Tabs (Offline video shows only when mode = offline) */}
            <div className="mt-4 flex flex-wrap gap-2 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`px-4 py-2 text-sm font-semibold transition-all rounded-md ${
                  activeTab === "details" ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                📝 Details
              </button>
              {form.mode === "offline" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("offlineVideo")}
                  className={`px-4 py-2 text-sm font-semibold transition-all rounded-md ${
                    activeTab === "offlineVideo"
                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  🎬 Offline video{!form.videoUrl ? " *" : ""}
                </button>
              )}
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              {activeTab === "details" && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                    <Input name="title" required value={form.title} onChange={handleChange} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                    <Textarea name="description" required value={form.description} onChange={handleChange} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                      <select
                        name="category"
                        required
                        value={form.category}
                        onChange={handleChange}
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="">Select a category</option>
                        <option value="Programming">Programming</option>
                        <option value="Design">Design</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Music">Music</option>
                        <option value="Fitness">Fitness</option>
                        <option value="Academics">Academics</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Mode</label>
                      <select
                        name="mode"
                        value={form.mode}
                        onChange={handleChange}
                        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="online">Live Session</option>
                        <option value="offline">Video format</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Credit cost</label>
                      <Input
                        name="creditCost"
                        type="number"
                        min={1}
                        value={form.creditCost}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === "offlineVideo" && form.mode === "offline" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">Upload offline video</p>
                        <p className="text-sm text-slate-500">
                          Upload a short lesson/preview video (mp4/webm/mov). Learners will see it on the skill page.
                        </p>
                      </div>
                      {form.videoUrl && (
                        <button
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, videoUrl: "" }))}
                          className="text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {videoError && <div className="mt-3"><Alert variant="error">{videoError}</Alert></div>}

                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Choose video file</label>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        disabled={videoUploading}
                        onChange={(e) => handleVideoUpload(e.target.files?.[0])}
                        className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                      />
                    </div>

                    {(videoUploading || videoProgress > 0) && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{videoUploading ? "Uploading..." : "Uploaded"}</span>
                          <span>{videoProgress}%</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 transition-all"
                            style={{ width: `${videoProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {form.videoUrl && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-slate-700 mb-2">Preview</p>
                        <video
                          controls
                          className="w-full rounded-xl border border-slate-200 bg-black"
                          src={
                            // For freshly selected uploads, local preview is most reliable.
                            // The saved skill video is streamed on the skill details page.
                            localVideoPreviewUrl || ""
                          }
                        />
                        <p className="mt-2 text-xs text-slate-500 break-all">Saved URL: {form.videoUrl}</p>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Upload Section */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4 mt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">Video Thumbnail (Optional)</p>
                        <p className="text-sm text-slate-500">
                          Upload a thumbnail image (jpg, png, webp). This will be shown as a preview before the video plays.
                        </p>
                      </div>
                      {form.thumbnailUrl && (
                        <button
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, thumbnailUrl: "" }))}
                          className="text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {thumbnailError && <div className="mt-3"><Alert variant="error">{thumbnailError}</Alert></div>}

                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Choose thumbnail image</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        disabled={thumbnailUploading}
                        onChange={(e) => handleThumbnailUpload(e.target.files?.[0])}
                        className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                      />
                      {thumbnailUploading && (
                        <p className="mt-2 text-xs text-slate-500">Uploading thumbnail...</p>
                      )}
                    </div>

                    {form.thumbnailUrl && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-slate-700 mb-2">Thumbnail Preview</p>
                        <img
                          src={`${apiOrigin}${form.thumbnailUrl}`}
                          alt="Thumbnail preview"
                          className="w-full max-w-md rounded-xl border border-slate-200 object-cover"
                          style={{ maxHeight: "200px" }}
                        />
                        <p className="mt-2 text-xs text-slate-500 break-all">Saved URL: {form.thumbnailUrl}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : editMode ? "Update skill" : "Create skill"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default SkillFormPage;

