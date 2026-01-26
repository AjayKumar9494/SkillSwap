import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { PageLayout } from "../components/PageLayout";
import { SkillCard } from "../components/SkillCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const SkillsPage = () => {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const query = {
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    mode: searchParams.get("mode") || "",
    page: Number(searchParams.get("page") || 1),
  };

  const [viewCounts, setViewCounts] = useState({});

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/skills", {
        params: { ...query, limit: 9, matchPreferences: true },
      });
      setSkills(data.items);
      setTotal(data.total);

      // Fetch view counts for offline skills
      const offlineSkills = data.items.filter(s => s.mode === "offline");
      const viewCountPromises = offlineSkills.map(async (skill) => {
        try {
          const { data: viewsData } = await api.get(`/skills/${skill._id}/video-views`);
          return { skillId: skill._id, views: viewsData?.views || 0 };
        } catch {
          return { skillId: skill._id, views: 0 };
        }
      });
      const viewCountResults = await Promise.all(viewCountPromises);
      const countsMap = {};
      viewCountResults.forEach(({ skillId, views }) => {
        countsMap[skillId] = views;
      });
      setViewCounts(countsMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [query.search, query.category, query.mode, query.page]);

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", 1);
    setSearchParams(params);
  };

  const totalPages = Math.max(1, Math.ceil(total / 9));

  return (
    <PageLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-600">Marketplace</p>
            <h1 className="text-3xl font-bold text-slate-900">Discover skills to learn</h1>
          </div>
          {user && (
            <Button asChild>
              <Link to="/skills/new">List a skill</Link>
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-3 flex flex-wrap gap-3">
            <Input
              placeholder="Search skills or keywords"
              value={query.search}
              onChange={(e) => updateParam("search", e.target.value)}
              className="max-w-lg"
            />
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={query.category}
              onChange={(e) => updateParam("category", e.target.value)}
            >
              <option value="">All categories</option>
              <option value="Programming">Programming</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Music">Music</option>
              <option value="Fitness">Fitness</option>
              <option value="Academics">Academics</option>
            </select>
            <select
              className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={query.mode}
              onChange={(e) => updateParam("mode", e.target.value)}
            >
              <option value="">Any mode</option>
              <option value="online">Live Session</option>
              <option value="offline">Video format</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Loading skills...</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill, idx) => (
              <motion.div
                key={skill._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <SkillCard skill={skill} viewCount={viewCounts[skill._id]} />
              </motion.div>
            ))}
          </div>
        )}
        {!loading && !skills.length && <p className="text-sm text-slate-600">No skills found.</p>}

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
          <span className="text-slate-600">
            Page {query.page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={query.page <= 1}
              onClick={() => updateParam("page", query.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={query.page >= totalPages}
              onClick={() => updateParam("page", query.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default SkillsPage;

