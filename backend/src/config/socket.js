import { Server } from "socket.io";
import { verifyToken } from "../utils/jwt.js";
import { Booking } from "../models/Booking.js";
import { User } from "../models/User.js";

export const initializeSocket = (server, allowedOrigins) => {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];
      if (!token) {
        return next(new Error("Authentication error"));
      }
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  // Track online users
  const onlineUsers = new Map(); // userId -> socketId

  io.on("connection", async (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Mark user as online
    try {
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date(),
      });
      onlineUsers.set(socket.userId, socket.id);
      
      // Notify other users that this user is online
      socket.broadcast.emit("user-online", { userId: socket.userId });
    } catch (err) {
      console.error("Error updating user online status:", err);
    }

    socket.on("join-room", async (data) => {
      const { bookingId } = data;
      try {
        // Verify user has access to this booking
        const booking = await Booking.findById(bookingId)
          .populate("learner", "_id")
          .populate("teacher", "_id");

        if (!booking) {
          socket.emit("error", { message: "Booking not found" });
          return;
        }

        const learnerId = booking.learner?._id || booking.learner;
        const teacherId = booking.teacher?._id || booking.teacher;
        const isLearner = String(learnerId) === String(socket.userId);
        const isTeacher = String(teacherId) === String(socket.userId);

        if (!isLearner && !isTeacher) {
          socket.emit("error", { message: "Not authorized to join this session" });
          return;
        }

        const roomId = `booking-${bookingId}`;
        socket.join(roomId);
        socket.emit("joined-room", { roomId, bookingId });

        // Send existing participants in this room to the newly joined socket.
        // This fixes the case where Teacher joined first, then Learner joins later and otherwise
        // would not receive the earlier "session-user-joined" event.
        try {
          const socketsInRoom = await io.in(roomId).fetchSockets();
          for (const s of socketsInRoom) {
            if (String(s.userId) !== String(socket.userId)) {
              socket.emit("session-user-joined", {
                roomId,
                userId: s.userId,
                joinedAt: new Date().toISOString(),
              });
            }
          }
        } catch (err) {
          console.error("Error sending existing room participants:", err);
        }

        // Session-scoped presence (Zoom-like): user is "online" for this session when joined the room
        socket.to(roomId).emit("session-user-joined", {
          roomId,
          userId: socket.userId,
          joinedAt: new Date().toISOString(),
        });

        // Mark learner as joined if they're the learner
        if (isLearner && !booking.learnerJoined) {
          booking.learnerJoined = true;
          booking.learnerJoinedAt = new Date();
          await booking.save();
        }

        // Notify other participants
        socket.to(roomId).emit("user-joined", { userId: socket.userId });
      } catch (err) {
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    socket.on("offer", (data) => {
      socket.to(data.roomId).emit("offer", {
        offer: data.offer,
        from: socket.userId,
      });
    });

    socket.on("answer", (data) => {
      socket.to(data.roomId).emit("answer", {
        answer: data.answer,
        from: socket.userId,
      });
    });

    socket.on("ice-candidate", (data) => {
      socket.to(data.roomId).emit("ice-candidate", {
        candidate: data.candidate,
        from: socket.userId,
      });
    });

    socket.on("chat-message", (data) => {
      socket.to(data.roomId).emit("chat-message", {
        message: data.message,
        from: socket.userId,
        senderName: data.senderName,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.userId}`);

      // Emit session-scoped presence leave for any booking rooms
      try {
        for (const roomId of socket.rooms) {
          if (roomId && typeof roomId === "string" && roomId.startsWith("booking-")) {
            socket.to(roomId).emit("session-user-left", {
              roomId,
              userId: socket.userId,
              leftAt: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.error("Error emitting session leave:", err);
      }
      
      // Check if user has other active connections
      const hasOtherConnections = Array.from(onlineUsers.entries()).some(
        ([userId, socketId]) => userId === socket.userId && socketId !== socket.id
      );
      
      if (!hasOtherConnections) {
        // Mark user as offline
        try {
          await User.findByIdAndUpdate(socket.userId, {
            isOnline: false,
            lastSeen: new Date(),
          });
          onlineUsers.delete(socket.userId);
          
          // Notify other users that this user is offline
          socket.broadcast.emit("user-offline", { userId: socket.userId });
        } catch (err) {
          console.error("Error updating user offline status:", err);
        }
      }
    });
  });

  return io;
};
