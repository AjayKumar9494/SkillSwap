import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  const [otherUserPresence, setOtherUserPresence] = useState({ isOnline: false, lastSeen: null });
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
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
    cleanup();
    setIsCallActive(false);
    setIsConnected(false);
    setIsScreenSharing(false);
  };

  const startCall = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
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
      setError("Failed to access media devices.");
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

  const toggleScreenShare = async () => {
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
            <div className="flex gap-4 h-[70vh]">
              {/* Main Video Area */}
              <div className="relative flex-1 rounded-3xl overflow-hidden bg-slate-900 shadow-2xl group border-4 border-white/10">
                <video
                  key={`main-${isSwapped}`}
                  ref={isSwapped ? localVideoRef : remoteVideoRef}
                  autoPlay
                  playsInline
                  muted={isSwapped}
                  className="h-full w-full object-cover transition-all duration-700"
                  style={!isSwapped ? {} : { transform: isScreenSharing ? "none" : "scaleX(-1)" }}
                />

                {/* Status Overlay */}
                <div className="absolute top-6 left-6 flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white z-10">
                  <div className={`w-3 h-3 rounded-full ${otherUserPresence.isOnline ? "bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" : "bg-slate-400"}`}></div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black tracking-tight">{!isSwapped ? otherUser?.name : "You (Preview)"}</span>
                    {!otherUserPresence.isOnline && !isSwapped && (
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        Last seen: {otherUserPresence.lastSeen ? new Date(otherUserPresence.lastSeen).toLocaleTimeString() : "Offline"}
                      </span>
                    )}
                    {otherUserPresence.isOnline && !isSwapped && (
                      <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Online</span>
                    )}
                  </div>
                </div>

                {/* Swappable Small Screen (PiP) */}
                <div
                  onClick={() => setIsSwapped(!isSwapped)}
                  className="absolute bottom-6 right-6 w-48 h-64 md:w-64 md:h-48 rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl cursor-pointer hover:scale-105 hover:border-indigo-400 transition-all duration-300 z-20 group"
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
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <span className="bg-white/90 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-lg">Swap View</span>
                  </div>
                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] text-white font-bold tracking-widest uppercase">
                    {isSwapped ? otherUser?.name : "You"}
                  </div>
                </div>

                {/* Switcher Tooltip */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-indigo-600 text-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl">
                    Click small screen to swap
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

          {isCallActive && (
            <div className="mt-6 flex justify-center gap-3">
              <Button variant={localVideoEnabled ? "default" : "destructive"} onClick={toggleVideo}>{localVideoEnabled ? "Stop Video" : "Start Video"}</Button>
              <Button variant={localAudioEnabled ? "default" : "destructive"} onClick={toggleAudio}>{localAudioEnabled ? "Mute" : "Unmute"}</Button>
              <Button variant={isScreenSharing ? "default" : "outline"} onClick={toggleScreenShare} className={isScreenSharing ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                {isScreenSharing ? "Stop Sharing" : "Share Screen"}
              </Button>
              <Button variant="outline" onClick={() => setIsChatOpen(!isChatOpen)}>
                Chat{unreadChatCount > 0 ? ` (${unreadChatCount})` : ""}
              </Button>
              <Button variant="destructive" onClick={endCall}>End Call</Button>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default VideoCallPage;