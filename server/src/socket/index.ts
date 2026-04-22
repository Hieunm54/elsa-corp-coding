import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { SocketData } from "./types";
import { registerAuthenticateHandler } from "./handlers/authenticate";
import { registerSubmitAnswerHandler } from "./handlers/submitAnswer";
import { logger } from "../logger";

let _io: SocketServer | null = null;

export function getIo(): SocketServer {
  if (!_io) throw new Error("Socket.IO not initialized");
  return _io;
}

export function setupSocket(httpServer: HttpServer): SocketServer {
  _io = new SocketServer<any, any, any, SocketData>(httpServer, {
    cors: { origin: "*" },
  });

  _io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    registerAuthenticateHandler(_io!, socket);
    registerSubmitAnswerHandler(_io!, socket);

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id, participantId: socket.data.participantId }, "Socket disconnected");
    });
  });

  return _io;
}
