import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

export const SkillCard = ({ skill, onDelete, showDelete = false, viewCount }) => (
  <Card className="h-full relative group">
    {showDelete && onDelete && (
      <button
        onClick={(e) => {
          e.preventDefault();
          if (window.confirm(`Are you sure you want to delete "${skill.title}"? This action cannot be undone.`)) {
            onDelete(skill._id);
          }
        }}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:shadow-lg"
        title="Delete skill"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </button>
    )}
    <CardHeader className="flex flex-row items-start justify-between gap-4">
      <div>
        <CardTitle>{skill.title}</CardTitle>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{skill.category}</Badge>
        </div>
      </div>
      <Badge className="bg-brand-50 text-brand-700 border border-brand-100">
        {skill.mode === "online" ? "Live Session" : skill.mode === "offline" ? "Video format" : skill.mode}
      </Badge>
    </CardHeader>
    <CardContent className="space-y-3">
      <p className="text-sm text-slate-600 line-clamp-3">{skill.description}</p>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-brand-700">{skill.creditCost} credits</span>
        {skill.mode === "offline" ? (
          <span className="text-slate-500">👁️ {viewCount !== undefined ? `${viewCount} views` : "Views: 0"}</span>
        ) : (
          <span className="text-slate-500">Rating: {skill.averageRating?.toFixed?.(1) || "0.0"}</span>
        )}
      </div>
      <Link to={`/skills/${skill._id}`} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        View details →
      </Link>
    </CardContent>
  </Card>
);

