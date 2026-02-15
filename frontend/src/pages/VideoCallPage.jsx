import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Video, VideoOff, Mic, MicOff, Volume2, VolumeX, Maximize2, Minimize2, Monitor, MessageCircle, PhoneOff } from "lucide-react";
import { PageLayout } from "../components/PageLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert } from "../components/Alert";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

const VideoCallPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [isConnected, setIsConnected] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [localVideoEnabled, setLocalVideoEnabled] = useState(true);
  const [localAudioEnabled, setLocalAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localOutputEnabled, setLocalOutputEnabled] = useState(true); // speaker: hear remote audio
  const [otherUserPresence, setOtherUserPresence] = useState({ isOnline: false, lastSeen: null });
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const videoStageRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const isInitiatorRef = useRef(false);
  const chatEndRef = useRef(null);

  const quickEmojis = ["😊", "👍", "❤️", "😂", "🎉", "👏", "🔥", "💯", "🤔", "👋"];

  const STUN_SERVERS = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchBooking = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/bookings/${bookingId}`);
        setBooking(data);
      } catch (err) {
        console.error("Error fetching booking:", err);
        setError(err.response?.data?.message || "Failed to load booking.");
      } finally {
        setLoading(false);
      }
    };
    if (bookingId) fetchBooking();

    return () => cleanup();
  }, [bookingId]);

  // Session-scoped real-time presence:
  // - Online when other user joins this booking room
  // - Last seen when other user leaves this booking room
  useEffect(() => {
    if (!booking || !socket || !user?._id) return;

    const otherUserObj = String(booking.teacher?._id || booking.teacher) === String(user?._id) ? booking.learner : booking.teacher;
    const otherUserId = otherUserObj?._id || otherUserObj;
    if (!otherUserId) return;

    const roomId = `booking-${bookingId}`;

    // Initial: assume offline until we hear join, but fetch "last seen" from profile
    const fetchInitial = async () => {
      try {
        const { data } = await api.get(`/users/${otherUserId}`);
        setOtherUserPresence({
          isOnline: false, // session-scoped; will turn true on session-user-joined
          lastSeen: data?.lastSeen || null,
        });
      } catch (err) {
        console.error("Failed to fetch initial presence:", err);
      }
    };
    fetchInitial();

    const onJoined = (payload) => {
      if (!payload) return;
      if (payload.roomId !== roomId) return;
      if (String(payload.userId) !== String(otherUserId)) return;
      setOtherUserPresence({ isOnline: true, lastSeen: null });
    };

    const onLeft = (payload) => {
      if (!payload) return;
      if (payload.roomId !== roomId) return;
      if (String(payload.userId) !== String(otherUserId)) return;
      setOtherUserPresence({ isOnline: false, lastSeen: payload.leftAt || new Date().toISOString() });
    };

    socket.on("session-user-joined", onJoined);
    socket.on("session-user-left", onLeft);

    return () => {
      socket.off("session-user-joined", onJoined);
      socket.off("session-user-left", onLeft);
    };
  }, [booking, socket, user?._id, bookingId]);

  const cleanup = () => {
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach((track) => track.stop());
    if (peerConnectionRef.current) peerConnectionRef.current.close();
    // Do NOT disconnect the shared socket from context
    if (socketRef.current) {
      socketRef.current.off("user-joined");
      socketRef.current.off("offer");
      socketRef.current.off("answer");
      socketRef.current.off("ice-candidate");
      socketRef.current.off("chat-message");
      socketRef.current.off("connect");
      socketRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const endCall = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    cleanup();
    setIsCallActive(false);
    setIsConnected(false);
    setIsScreenSharing(false);
    setIsFullscreen(false);
  };

  const toggleFullscreen = async () => {
    if (!videoStageRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await videoStageRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn("Fullscreen error:", err);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const isMobileOrCapacitor = () => {
    if (typeof window === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      window.Capacitor?.isNativePlatform?.() === true;
  };

  const startCall = async () => {
    try {
      setError("");
      const isMobile = isMobileOrCapacitor();
      // Higher quality media constraints for better mic audio and video in live sessions
      const videoConstraints = isMobile
        ? { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 }, facingMode: "user" }
        : { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } };
      const audioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        localVideoRef.current.playsInline = true;
        localVideoRef.current.play?.().catch(() => {});
      }

      const pc = new RTCPeerConnection(STUN_SERVERS);
      pc.onicecandidate = (e) => {
        if (e.candidate && socketRef.current) {
          socketRef.current.emit("ice-candidate", { roomId: `booking-${bookingId}`, candidate: e.candidate });
        }
      };
      pc.ontrack = (e) => {
        if (e.streams[0] && remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
      };
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      peerConnectionRef.current = pc;

      if (!socket) {
        setError("Socket connection not available.");
        return;
      }

      // Avoid duplicating listeners if user clicks Start Call twice
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("chat-message");
      socket.off("connect");

      socketRef.current = socket;

      socket.on("connect", () => setIsConnected(true));

      // Join the room for this booking
      socket.emit("join-room", { bookingId });

      socket.on("user-joined", async () => {
        isInitiatorRef.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { roomId: `booking-${bookingId}`, offer });
      });

      socket.on("offer", async ({ offer }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", { roomId: `booking-${bookingId}`, answer });
      });

      socket.on("answer", ({ answer }) => pc.setRemoteDescription(new RTCSessionDescription(answer)));
      socket.on("ice-candidate", ({ candidate }) => pc.addIceCandidate(new RTCIceCandidate(candidate)));

      socket.on("chat-message", (msg) => {
        setChatMessages((prev) => [...prev, msg]);
        // Unread badge when chat is closed and message is from other user
        if (!isChatOpen && String(msg?.from) !== String(user._id)) {
          setUnreadChatCount((c) => c + 1);
        }
      });

      setIsCallActive(true);
    } catch (err) {
      console.error(err);
      const msg = err?.name === "NotAllowedError" || err?.message?.toLowerCase?.().includes("permission")
        ? "Camera or microphone access was denied. Please allow permissions in your device settings and try again."
        : "Failed to access camera or microphone. Check app permissions in Settings and try again.";
      setError(msg);
    }
  };

  // Reset unread when opening chat
  useEffect(() => {
    if (isChatOpen) setUnreadChatCount(0);
  }, [isChatOpen]);

  // Sync video streams when swapped
  useEffect(() => {
    if (isCallActive) {
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      // Re-assign remote stream if it exists (ontrack usually handles this, but PiP swap needs manual re-sync)
      if (remoteVideoRef.current && peerConnectionRef.current) {
        const remoteStream = peerConnectionRef.current.getRemoteStreams()[0];
        if (remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      }
    }
  }, [isSwapped, isCallActive]);

  // Sync remote video volume (speaker on/off)
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (el) el.volume = localOutputEnabled ? 1 : 0;
  }, [localOutputEnabled, isCallActive]);

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      track.enabled = !track.enabled;
      setLocalVideoEnabled(track.enabled);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      track.enabled = !track.enabled;
      setLocalAudioEnabled(track.enabled);
    }
  };

  const toggleSpeaker = () => setLocalOutputEnabled((v) => !v);

  const stopScreenShareSilently = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    const sender = peerConnectionRef.current?.getSenders().find((s) => s.track?.kind === "video");
    if (sender && cameraTrack) {
      await sender.replaceTrack(cameraTrack);
    }

    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    setIsScreenSharing(false);
  };

  const canScreenShare = typeof navigator !== "undefined" &&
    navigator.mediaDevices?.getDisplayMedia &&
    !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const toggleScreenShare = async () => {
    if (!canScreenShare) {
      setError("Screen share is not supported on this device. Use a laptop or desktop.");
      return;
    }
    try {
      if (isScreenSharing) {
        await stopScreenShareSilently();
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        const sender = peerConnectionRef.current?.getSenders().find((s) => s.track?.kind === "video");
        if (sender && screenTrack) {
          await sender.replaceTrack(screenTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          stopScreenShareSilently();
        };

        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error("Screen share error:", err);
      setError("Failed to share screen: " + err.message);
    }
  };

  const insertEmoji = (emoji) => setChatInput((prev) => prev + emoji);

  const sendChatMessage = () => {
    if (!chatInput.trim() || !socketRef.current) return;
    const msg = {
      message: chatInput.trim(),
      from: String(user._id),
      senderName: user.name,
      timestamp: new Date().toISOString()
    };

    // Add locally immediately
    setChatMessages((prev) => [...prev, msg]);

    // Emit to others
    socketRef.current.emit("chat-message", {
      roomId: `booking-${bookingId}`,
      ...msg
    });

    setChatInput("");
  };

  if (loading) return <PageLayout><div className="flex min-h-screen items-center justify-center p-10">Loading session...</div></PageLayout>;
  if (error || !booking) return <PageLayout><div className="flex min-h-screen items-center justify-center p-10"><Alert variant="error">{error || "Booking not found"}</Alert></div></PageLayout>;

  const canStart = !booking.sessionStartTime || now >= new Date(booking.sessionStartTime);
  const isExpired = booking.sessionEndTime && now >= new Date(booking.sessionEndTime);
  const otherUser = String(booking.teacher?._id || booking.teacher) === String(user?._id) ? booking.learner : booking.teacher;

  const getTimeRemaining = () => {
    if (!booking.sessionEndTime) return null;
    const diff = new Date(booking.sessionEndTime) - now;
    if (diff <= 0) return "00:00:00";
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <PageLayout>
      <div className="flex min-h-screen flex-col">
        <div className="mb-4">
          <Button variant="outline" onClick={() => navigate("/bookings")}>← Back to Bookings</Button>
        </div>

        <Card className="mb-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Video Call Session</CardTitle>
            {isCallActive && booking.sessionEndTime && (
              <div className="px-4 py-2 rounded-full bg-red-100 text-red-700 font-bold border border-red-200">
                Time Remaining: {getTimeRemaining()}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">Session with: <span className="font-semibold">{otherUser?.name || "Loading..."}</span></p>
            <p className="text-sm text-slate-600">Skill: {booking.skill?.title}</p>
            {booking.sessionStartTime && <p className="text-xs text-indigo-600 font-medium mt-1">Scheduled: {new Date(booking.sessionStartTime).toLocaleString()}</p>}
          </CardContent>
        </Card>

        <div className="flex-1">
          {!isCallActive ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50">
              <div className="text-center">
                {!canStart ? (
                  <div className="space-y-4">
                    <div className="text-6xl">⏳</div>
                    <h3 className="text-xl font-bold">Session hasn't started yet</h3>
                    <p className="text-slate-500">Wait for the scheduled time.</p>
                  </div>
                ) : isExpired ? (
                  <div className="space-y-4">
                    <div className="text-6xl">⌛</div>
                    <h3 className="text-xl font-bold">Session has expired</h3>
                    <Button onClick={() => navigate("/bookings")} variant="outline">Back to Bookings</Button>
                  </div>
                ) : (
                  <Button onClick={startCall} size="lg" className="h-14 px-10 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-xl">Start Call Now</Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-4 h-[70vh] min-h-[400px]">
              {/* Zoom-style: main stage (teacher full) + small PiP (you) */}
              <div
                ref={videoStageRef}
                className="relative flex-1 rounded-2xl overflow-hidden bg-black shadow-2xl flex flex-col"
              >
                {/* Main speaker view — fills stage; default = remote (teacher) */}
                <div className="relative flex-1 min-h-0 w-full">
                  <video
                    key={`main-${isSwapped}`}
                    ref={isSwapped ? localVideoRef : remoteVideoRef}
                    autoPlay
                    playsInline
                    muted={isSwapped}
                    className="absolute inset-0 h-full w-full object-contain"
                    style={!isSwapped ? {} : { transform: isScreenSharing ? "none" : "scaleX(-1)" }}
                  />
                  {/* Name badge on main view */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white z-10">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${otherUserPresence.isOnline ? "bg-green-400 animate-pulse" : "bg-slate-400"}`} />
                    <span className="text-sm font-semibold truncate max-w-[180px]">
                      {!isSwapped ? (otherUser?.name || "Teacher") : "You"}
                    </span>
                    {!isSwapped && otherUserPresence.isOnline && (
                      <span className="text-[10px] text-green-300 font-medium">LIVE</span>
                    )}
                  </div>
                </div>

                {/* PiP — small corner tile (like Zoom); click to swap who is main */}
                <div
                  onClick={() => setIsSwapped(!isSwapped)}
                  className="absolute bottom-20 right-4 w-[120px] h-[90px] sm:w-[160px] sm:h-[100px] md:w-[180px] md:h-[120px] rounded-lg overflow-hidden border-2 border-white/40 shadow-xl cursor-pointer hover:border-blue-400 hover:shadow-2xl transition-all z-20 bg-slate-800"
                >
                  <video
                    key={`pip-${isSwapped}`}
                    ref={isSwapped ? remoteVideoRef : localVideoRef}
                    autoPlay
                    playsInline
                    muted={!isSwapped}
                    className="h-full w-full object-cover"
                    style={isSwapped ? {} : { transform: isScreenSharing ? "none" : "scaleX(-1)" }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 py-1 px-2 bg-black/60 text-center">
                    <span className="text-[10px] font-semibold text-white">
                      {isSwapped ? otherUser?.name || "Teacher" : "You"}
                    </span>
                  </div>
                  <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-black/50 text-[10px] text-white">
                    Tap to swap
                  </div>
                </div>

                {/* In-stage control bar (Zoom-style); visible in normal and fullscreen; icons white for visibility on dark bar (desktop + mobile) */}
                <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-wrap items-center justify-center gap-2 sm:gap-3 px-2 py-3 sm:px-3 sm:py-3 bg-gradient-to-t from-black/90 to-transparent [&_button]:text-white [&_button_svg]:text-white">
                  <div className="flex flex-col items-center gap-0.5">
                    <Button variant={localVideoEnabled ? "secondary" : "destructive"} size="sm" onClick={toggleVideo} className="rounded-full h-10 w-10 p-0 shrink-0 text-white" title={localVideoEnabled ? "Stop video" : "Start video"}>{localVideoEnabled ? <Video className="h-5 w-5 text-white" /> : <VideoOff className="h-5 w-5 text-white" />}</Button>
                    <span className="text-[10px] text-white/80">Camera</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Button variant={localAudioEnabled ? "secondary" : "destructive"} size="sm" onClick={toggleAudio} className="rounded-full h-10 w-10 p-0 shrink-0 text-white" title={localAudioEnabled ? "Mute microphone" : "Unmute microphone"}>{localAudioEnabled ? <Mic className="h-5 w-5 text-white" /> : <MicOff className="h-5 w-5 text-white" />}</Button>
                    <span className="text-[10px] text-white/80">Mic</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Button variant={localOutputEnabled ? "secondary" : "destructive"} size="sm" onClick={toggleSpeaker} className="rounded-full h-10 w-10 p-0 shrink-0 text-white" title={localOutputEnabled ? "Mute speaker" : "Unmute speaker"}>{localOutputEnabled ? <Volume2 className="h-5 w-5 text-white" /> : <VolumeX className="h-5 w-5 text-white" />}</Button>
                    <span className="text-[10px] text-white/80">Speaker</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Button variant="secondary" size="sm" onClick={toggleFullscreen} className="rounded-full h-10 w-10 p-0 shrink-0 text-white" title={isFullscreen ? "Exit full screen" : "Full screen"}>{isFullscreen ? <Minimize2 className="h-5 w-5 text-white" /> : <Maximize2 className="h-5 w-5 text-white" />}</Button>
                    <span className="text-[10px] text-white/80">Full screen</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    {canScreenShare ? (
                      <Button variant={isScreenSharing ? "default" : "secondary"} size="sm" onClick={toggleScreenShare} className={`rounded-full h-10 w-10 p-0 shrink-0 text-white ${isScreenSharing ? "bg-green-600 hover:bg-green-700" : ""}`} title={isScreenSharing ? "Stop sharing screen" : "Share screen"}><Monitor className="h-5 w-5 text-white" /></Button>
                    ) : (
                      <Button variant="secondary" size="sm" disabled className="rounded-full h-10 w-10 p-0 shrink-0 opacity-60 text-white" title="Share screen (desktop only)"><Monitor className="h-5 w-5 text-white" /></Button>
                    )}
                    <span className="text-[10px] text-white/80">Share</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Button variant="secondary" size="sm" onClick={() => setIsChatOpen(!isChatOpen)} className="rounded-full h-10 w-10 p-0 shrink-0 relative text-white" title="Chat">
                      <MessageCircle className="h-5 w-5 text-white" />
                      {unreadChatCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadChatCount > 9 ? "9+" : unreadChatCount}</span>}
                    </Button>
                    <span className="text-[10px] text-white/80">Chat</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <Button variant="destructive" size="sm" onClick={endCall} className="rounded-full h-10 w-10 p-0 shrink-0 text-white" title="End call"><PhoneOff className="h-5 w-5 text-white" /></Button>
                    <span className="text-[10px] text-white/80">End</span>
                  </div>
                </div>
              </div>

              {isChatOpen && (
                <div className="w-96 rounded-xl bg-white shadow-2xl flex flex-col overflow-hidden">
                  <div className="p-4 bg-indigo-600 text-white font-bold">Live Chat</div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${String(msg.from) === String(user._id) ? "justify-end" : "justify-start"}`}>
                        <div className={`p-2 rounded-lg max-w-[80%] ${String(msg.from) === String(user._id) ? "bg-indigo-500 text-white" : "bg-white border"}`}>
                          <p className="text-xs font-bold opacity-70">{String(msg.from) === String(user._id) ? "You" : msg.senderName}</p>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="px-3 pb-2 flex flex-wrap gap-1 border-b bg-white">
                    {quickEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-lg transition-all active:scale-90"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="p-3 border-t flex gap-2 items-center bg-white">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-2 rounded-lg transition-colors ${showEmojiPicker ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}
                      title="Emojis"
                    >
                      😊
                    </button>
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                      className="flex-1 border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="Type a message..."
                    />
                    <Button onClick={sendChatMessage} className="rounded-xl px-5 font-bold shadow-lg shadow-indigo-100">Send</Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </PageLayout>
  );
};

export default VideoCallPage;