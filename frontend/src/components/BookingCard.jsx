import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

const statusColors = {
  pending: "bg-amber-100 text-amber-700 border-amber-300",
  approved: "bg-green-100 text-green-700 border-green-300",
  rejected: "bg-red-100 text-red-700 border-red-300",
  completed: "bg-blue-100 text-blue-700 border-blue-300",
  cancelled: "bg-slate-100 text-slate-700 border-slate-300",
};

const statusIcons = {
  pending: "⏳",
  approved: "✅",
  rejected: "❌",
  completed: "🎉",
  cancelled: "🚫",
};

export const BookingCard = ({ booking }) => (
  <motion.div
    whileHover={{ scale: 1.01, x: 5 }}
    className="h-full"
  >
    <Card className="h-full border-2 border-slate-200 hover:border-blue-300 transition-all overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex-1">
          <CardTitle className="text-lg font-bold text-slate-900 mb-1">
            {booking.skill?.title || "Skill"}
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>👤 Learner: <span className="font-semibold">{booking.learner?.name}</span></span>
            <span className="mx-2">•</span>
            <span>👨‍🏫 Teacher: <span className="font-semibold">{booking.teacher?.name}</span></span>
          </div>
        </div>
        <Badge className={`capitalize ${statusColors[booking.status] || statusColors.pending} border-2`}>
          {statusIcons[booking.status] || "⏳"} {booking.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">💰</span>
            <span className="font-semibold text-slate-900">{booking.creditCost} credits</span>
          </div>
          {booking.sessionDate && (
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <span>📅</span>
              <span>{new Date(booking.sessionDate).toLocaleString()}</span>
            </div>
          )}
        </div>
        {booking.sessionDuration && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>⏱️</span>
            <span>Duration: {booking.sessionDuration} minutes</span>
            {booking.sessionEndTime && (
              <span className="text-slate-500">
                • Ends: {new Date(booking.sessionEndTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}
        {booking.message && (
          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <p className="text-sm text-slate-600 italic">"{booking.message}"</p>
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);
