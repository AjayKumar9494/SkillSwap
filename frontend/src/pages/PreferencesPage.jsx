import { useEffect, useState } from "react";
import { PageLayout } from "../components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Alert } from "../components/Alert";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const PreferencesPage = () => {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ categories: [], location: "", mode: "online", language: "" });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.preferences) {
      setForm({
        categories: user.preferences.categories || [],
        location: user.preferences.location || "",
        mode: user.preferences.mode || "online",
        language: user.preferences.language || "",
      });
    }
  }, [user]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    setError("");
    try {
      const payload = { ...form, categories: form.categories.filter(Boolean) };
      const { data } = await api.put("/users/me/preferences", payload);
      setUser(data.user);
      setStatus("Preferences updated");
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    }
  };

  return (
    <PageLayout>
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Learning preferences</CardTitle>
            <p className="text-sm text-slate-500">Auto-filter skill listings based on your choices.</p>
          </CardHeader>
          <CardContent>
            {status && <Alert variant="success">{status}</Alert>}
            {error && <Alert variant="error">{error}</Alert>}
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Preferred categories (comma separated)</label>
                <Input
                  name="categories"
                  value={form.categories.join(", ")}
                  onChange={(e) => setForm({ ...form, categories: e.target.value.split(",").map((c) => c.trim()) })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
                  <Input name="location" value={form.location} onChange={handleChange} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Preferred mode</label>
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
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Language</label>
                <Input name="language" value={form.language} onChange={handleChange} />
              </div>
              <Button type="submit">Save preferences</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default PreferencesPage;

