import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const iconMap = {
  Credits: "💰",
  Rating: "⭐",
  "Listed Skills": "📚",
  Earnings: "💵",
  "Total Earnings": "💵",
  "Booked Skills": "🎓",
  Completed: "✅",
};

const colorMap = {
  Credits: "from-blue-500 to-cyan-500",
  Rating: "from-yellow-500 to-orange-500",
  "Listed Skills": "from-purple-500 to-pink-500",
  Earnings: "from-green-500 to-emerald-500",
  "Total Earnings": "from-green-500 to-emerald-500",
  "Booked Skills": "from-indigo-500 to-blue-500",
  Completed: "from-teal-500 to-cyan-500",
};

export const StatCard = ({ title, value, helper, index = 0 }) => {
  const icon = iconMap[title] || "📊";
  const gradient = colorMap[title] || "from-slate-500 to-slate-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="h-full"
    >
      <Card className="h-full border-2 border-slate-200 hover:border-blue-300 transition-all group overflow-hidden relative">
        {/* Gradient overlay on hover */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
        
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
            <motion.div
              className="text-2xl"
              whileHover={{ scale: 1.2, rotate: 10 }}
            >
              {icon}
            </motion.div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <motion.p
            className={`text-4xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1 + 0.2 }}
          >
            {value}
          </motion.p>
          {helper && (
            <p className="mt-2 text-sm text-slate-500">{helper}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
