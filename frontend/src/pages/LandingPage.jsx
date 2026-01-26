import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { PageLayout } from "../components/PageLayout";
import { api } from "../services/api";

const highlights = [
  { 
    title: "Learn anything", 
    desc: "Browse curated skills across tech, language, arts, and more.",
    icon: "📚",
    color: "from-blue-500 to-cyan-500"
  },
  { 
    title: "Teach & earn credits", 
    desc: "Share your expertise and earn credits to spend on learning.",
    icon: "💡",
    color: "from-purple-500 to-pink-500"
  },
  { 
    title: "Trust-first", 
    desc: "Verified reviews, ratings, and booking approvals keep it safe.",
    icon: "🛡️",
    color: "from-green-500 to-emerald-500"
  },
];

const features = [
  {
    title: "Video Calls",
    desc: "Real-time video sessions with teachers",
    icon: "🎥"
  },
  {
    title: "Category Filter",
    desc: "Find skills by Programming, Design, Marketing & more",
    icon: "🔍"
  },
  {
    title: "Secure Payments",
    desc: "Credit-based system for safe transactions",
    icon: "💳"
  },
  {
    title: "Reviews & Ratings",
    desc: "Community-driven quality assurance",
    icon: "⭐"
  },
];

const formatCompact = (n) => {
  if (typeof n !== "number") return "—";
  try {
    return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
  } catch {
    return String(n);
  }
};

const LandingPage = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [liveStats, setLiveStats] = useState({ skillsListed: null, bookingsCompleted: null });
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 100]);
  const y2 = useTransform(scrollY, [0, 300], [0, -100]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        const { data } = await api.get("/stats/public");
        if (!cancelled) {
          setLiveStats({
            skillsListed: typeof data?.skillsListed === "number" ? data.skillsListed : null,
            bookingsCompleted: typeof data?.bookingsCompleted === "number" ? data.bookingsCompleted : null,
          });
        }
      } catch {
        // Silent fallback
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 15000); // real-time-ish
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const stats = [
    { value: formatCompact(liveStats.skillsListed), label: "Skills listed", delay: 0 },
    { value: formatCompact(liveStats.bookingsCompleted), label: "Bookings completed", delay: 0.1 },
  ];

  return (
    <PageLayout hideNav>
      <div className="relative overflow-hidden min-h-screen">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x + 50}% ${mousePosition.y + 50}%, rgba(59, 130, 246, 0.3), transparent 50%)`,
          }}
        />
        
        {/* Floating Shapes */}
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, -100, 0],
            y: [0, 80, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-32 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, 50, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="relative z-10 container py-8 md:py-16">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-12"
          >
            <Link to="/" className="flex items-center gap-3 group">
              <motion.span
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold text-lg shadow-lg"
              >
                SS
              </motion.span>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SkillSwap
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors"
              >
                Login
              </Link>
              <Button size="sm" asChild className="shadow-md hover:shadow-lg transition-shadow">
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          </motion.header>

          {/* Hero Section */}
          <div className="grid items-center gap-12 lg:grid-cols-2 mb-20">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl md:text-6xl font-extrabold tracking-tight"
              >
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Trade skills, not money.
                </span>
                <br />
                <span className="text-slate-900">Learn and teach with SkillSwap.</span>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-slate-600 leading-relaxed"
              >
                Earn credits by teaching what you know. Spend credits to learn what you want. A trusted, community-first
                marketplace for skill exchange.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-4"
              >
                <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  <Link to="/register">Join SkillSwap</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="hover:scale-105 transition-all">
                  <Link to="/skills">Explore skills</Link>
                </Button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 gap-6 pt-8 max-w-md"
              >
                {stats.map((stat, idx) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + stat.delay }}
                    whileHover={{ scale: 1.1 }}
                    className="text-center"
                  >
                    <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">{stat.label}</p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            {/* Features Preview */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{ y: y1 }}
              className="space-y-6"
            >
              {highlights.map((h, idx) => (
                <motion.div
                  key={h.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  whileHover={{ scale: 1.02, x: 10 }}
                  className="group"
                >
                  <Card className="border-2 border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-r ${h.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    <CardContent className="p-6 relative">
                      <div className="flex items-start gap-4">
                        <motion.div
                          className="text-4xl"
                          whileHover={{ scale: 1.2, rotate: 10 }}
                        >
                          {h.icon}
                        </motion.div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-900 mb-2">{h.title}</h3>
                          <p className="text-slate-600">{h.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Features Grid */}
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-20"
          >
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-bold text-center mb-12"
            >
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Why Choose SkillSwap?
              </span>
            </motion.h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  whileHover={{ y: -10, scale: 1.05 }}
                  className="group"
                >
                  <Card className="h-full border-2 border-slate-200 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-xl transition-all cursor-pointer">
                    <CardContent className="p-6 text-center">
                      <motion.div
                        className="text-5xl mb-4"
                        whileHover={{ scale: 1.2, rotate: 360 }}
                        transition={{ duration: 0.5 }}
                      >
                        {feature.icon}
                      </motion.div>
                      <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                      <p className="text-sm text-slate-600">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* CTA Section */}
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="relative mb-20"
          >
            <div className="relative rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-12 text-center text-white overflow-hidden">
              <motion.div
                className="absolute inset-0 opacity-20"
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                style={{
                  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
                  backgroundSize: "50px 50px",
                }}
              />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative z-10"
              >
                <h2 className="text-4xl md:text-5xl font-bold mb-4">
                  Ready to Start Learning?
                </h2>
                <p className="text-xl mb-8 opacity-90">
                  Join thousands of learners and teachers on SkillSwap today
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button size="lg" variant="outline" asChild className="bg-white text-blue-600 hover:bg-slate-100 border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                    <Link to="/register">Get Started Free</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="bg-white/10 text-white border-2 border-white hover:bg-white/20 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                    <Link to="/skills">Browse Skills</Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </motion.section>
        </div>
      </div>
    </PageLayout>
  );
};

export default LandingPage;
