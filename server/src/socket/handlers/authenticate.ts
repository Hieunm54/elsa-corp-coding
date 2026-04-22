import { Server, Socket } from "socket.io";
import redis from "../../redis/client";
import { keys } from "../../redis/keys";
import { logger } from "../../logger";
import { SocketData } from "../types";

export function registerAuthenticateHandler(
  io: Server,
  socket: Socket<any, any, any, SocketData>
) {
  socket.on("authenticate", async (payload: { token?: string }) => {
    const token = payload?.token;

    if (!token) {
      socket.emit("error", { message: "token is required" });
      socket.disconnect();
      return;
    }

    const raw = await redis.get(keys.session(token));
    if (!raw) {
      socket.emit("error", { message: "Invalid or expired session" });
      socket.disconnect();
      return;
    }

    const { participantId, quizId, username } = JSON.parse(raw) as SocketData;

    socket.data = { participantId, quizId, username };

    const room = `quizzes:${quizId}`;
    await socket.join(room);

    const roomSockets = await io.in(room).fetchSockets();

    socket.emit("authenticated", { participantId, username });
    socket.to(room).emit("participant_joined", { username, count: roomSockets.length });

    logger.info({ participantId, quizId, username }, "Participant authenticated");
  });
}
