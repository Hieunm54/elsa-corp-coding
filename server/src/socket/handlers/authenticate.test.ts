import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../redis/client", () => ({
  default: { get: vi.fn() },
}));

import redis from "../../redis/client";
import { registerAuthenticateHandler } from "./authenticate";

const session = { participantId: "pid-1", quizId: "quiz-001", username: "alice" };

function makeSocket() {
  const socket: any = {
    id: "sock-1",
    data: {},
    emit: vi.fn(),
    join: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    to: vi.fn().mockReturnValue({ emit: vi.fn() }),
    on: vi.fn(),
  };
  return socket;
}

function makeIo(count = 1) {
  return {
    in: vi.fn().mockReturnValue({
      fetchSockets: vi.fn().mockResolvedValue(new Array(count)),
    }),
  } as any;
}

async function triggerAuthenticate(socket: any, io: any, payload: unknown) {
  registerAuthenticateHandler(io, socket);
  const handler = socket.on.mock.calls.find(([e]: [string]) => e === "authenticate")?.[1];
  await handler(payload);
}

describe("authenticate handler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("joins room and emits authenticated on valid token", async () => {
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify(session));
    const socket = makeSocket();

    await triggerAuthenticate(socket, makeIo(2), { token: "tok-valid" });

    expect(socket.join).toHaveBeenCalledWith("quizzes:quiz-001");
    expect(socket.emit).toHaveBeenCalledWith("authenticated", {
      participantId: "pid-1",
      username: "alice",
    });
    expect(socket.data).toMatchObject(session);
  });

  it("broadcasts participant_joined to the room", async () => {
    vi.mocked(redis.get).mockResolvedValue(JSON.stringify(session));
    const socket = makeSocket();

    await triggerAuthenticate(socket, makeIo(2), { token: "tok-valid" });

    expect(socket.to).toHaveBeenCalledWith("quizzes:quiz-001");
    expect(socket.to("quizzes:quiz-001").emit).toHaveBeenCalledWith(
      "participant_joined",
      { username: "alice", count: 2 }
    );
  });

  it("disconnects when token is missing", async () => {
    const socket = makeSocket();
    await triggerAuthenticate(socket, makeIo(), {});
    expect(socket.disconnect).toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith("error", expect.objectContaining({ message: expect.any(String) }));
  });

  it("disconnects when token is invalid", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    const socket = makeSocket();
    await triggerAuthenticate(socket, makeIo(), { token: "bad-token" });
    expect(socket.disconnect).toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith("error", expect.objectContaining({ message: expect.any(String) }));
  });
});
