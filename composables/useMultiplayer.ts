import { computed } from "vue";
import { io, type Socket } from "socket.io-client";
import { useApi } from "~/composables/useApi";

export type MultiplayerMode = "team_rps_vote" | "majority_die" | "highest_win";

export interface MultiplayerRoomListItem {
  id: string;
  name: string;
  mode: MultiplayerMode;
  stake: number;
  entryStake: number;
  hostUserId: string;
  hostDisplayName?: string;
  hostAvatarIndex?: number;
  status: "waiting" | "playing" | "resolved" | "closed";
  maxPlayers: number;
  players: number;
  createdAt: number;
}

export interface MultiplayerRoomPlayer {
  userId: string;
  displayName: string;
  avatarIndex?: number;
  alive?: boolean;
}

export interface TeamRpsRoomState {
  roomId: string;
  mode: "team_rps_vote";
  status: "waiting" | "playing" | "resolved" | "closed";
  matchFormat?: string;
  round?: number;
  score: { A: number; B: number };
  entryStake: number;
  stake: number;
  teams: {
    A: MultiplayerRoomPlayer[];
    B: MultiplayerRoomPlayer[];
  };
  teamCounts: { A: number; B: number };
  inputEndsAt?: number | null;
  hostUserId?: string;
}

export interface TeamRpsSubmittedCount {
  roomId: string;
  round: number;
  submittedA: number;
  submittedB: number;
  totalA: number;
  totalB: number;
  secondsLeft: number;
}

export interface TeamRpsRoundResolved {
  roomId: string;
  round: number;
  teamChoice: { A: "rock" | "paper" | "scissors"; B: "rock" | "paper" | "scissors" };
  teamVoteCount: {
    A: Record<"rock" | "paper" | "scissors", number>;
    B: Record<"rock" | "paper" | "scissors", number>;
  };
  teamVoteTieBreak?: { A: boolean; B: boolean };
  roundWinner: "A" | "B" | "draw";
  score: { A: number; B: number };
  resolvedAt: number;
}

export interface TeamRpsFinished {
  roomId: string;
  winnerTeam?: "A" | "B";
  score?: { A: number; B: number };
  entryStake?: number;
  stake?: number;
  winners?: Array<{
    userId: string;
    displayName: string;
    avatarIndex?: number;
  }>;
  payouts?: Array<{
    userId: string;
    amount: number;
  }>;
  draw?: boolean;
  reason?: string;
  refunds?: Array<{
    userId: string;
    amount: number;
  }>;
  endedAt: number;
}

export interface MultiplayerRoomDetail {
  id: string;
  name: string;
  mode: MultiplayerMode;
  stake: number;
  entryStake: number;
  hostUserId: string;
  status: "waiting" | "playing" | "resolved" | "closed";
  stage?: number;
  stageEndsAt?: number | null;
  players: MultiplayerRoomPlayer[];
  createdAt?: number;
}

interface MultiplayerRoomsResponse {
  items: MultiplayerRoomListItem[];
}

interface MultiplayerRoomResponse {
  room: MultiplayerRoomDetail;
}

let multiplayerSocket: Socket | null = null;
let subscribedMode: MultiplayerMode | null = null;

const normalizeOrigin = (apiBaseUrl: string) =>
  apiBaseUrl.replace(/\/api\/v1\/?$/, "");

const roomsBasePath = (mode: MultiplayerMode) => {
  if (mode === "team_rps_vote") return "team-rps-vote/rooms";
  return "multiplayer/rooms";
};

export const useMultiplayer = () => {
  const { apiFetch, apiBaseUrl } = useApi();
  const authToken = useState<string | null>("authToken", () => null);
  const rooms = useState<MultiplayerRoomListItem[]>("multiplayer-room-list", () => []);
  const roomDetails = useState<Record<string, MultiplayerRoomDetail>>("multiplayer-room-details", () => ({}));
  const teamRpsStates = useState<Record<string, TeamRpsRoomState>>("team-rps-room-states", () => ({}));
  const teamRpsSubmittedCounts = useState<Record<string, TeamRpsSubmittedCount>>("team-rps-submitted-counts", () => ({}));
  const teamRpsResolvedRounds = useState<Record<string, TeamRpsRoundResolved>>("team-rps-resolved-rounds", () => ({}));
  const teamRpsFinishedStates = useState<Record<string, TeamRpsFinished>>("team-rps-finished-states", () => ({}));

  const socketOrigin = computed(() => normalizeOrigin(apiBaseUrl.value));

  const authHeaders = computed(() =>
    authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {},
  );

  const refreshRooms = async (mode: MultiplayerMode = "team_rps_vote") => {
    const query = new URLSearchParams({
      page: "1",
      limit: "20",
    });

    if (mode !== "team_rps_vote") {
      query.set("mode", mode);
    }

    const response = await apiFetch<MultiplayerRoomsResponse>(`${roomsBasePath(mode)}?${query.toString()}`, {
      method: "GET",
      headers: authHeaders.value,
    });

    rooms.value = Array.isArray(response.items) ? response.items : [];
    return rooms.value;
  };

  const createRoom = async (payload: {
    name: string;
    mode: MultiplayerMode;
    entryStake: number;
  }) => {
    const body =
      payload.mode === "team_rps_vote"
        ? {
            name: payload.name,
            entryStake: payload.entryStake,
          }
        : {
            name: payload.name,
            entryStake: payload.entryStake,
          };

    const response = await apiFetch<{ ok?: boolean; room: MultiplayerRoomListItem }>(roomsBasePath(payload.mode), {
      method: "POST",
      headers: authHeaders.value,
      body,
    });

    if (response.room?.id) {
      rooms.value = [response.room, ...rooms.value.filter((room) => room.id !== response.room.id)];
    }

    return response.room;
  };

  const fetchRoom = async (roomId: string, mode: MultiplayerMode = "team_rps_vote") => {
    const response = await apiFetch<MultiplayerRoomResponse>(`${roomsBasePath(mode)}/${roomId}`, {
      method: "GET",
      headers: authHeaders.value,
    });

    if (response.room?.id) {
      roomDetails.value = {
        ...roomDetails.value,
        [roomId]: response.room,
      };

      if (mode === "team_rps_vote") {
        const rawRoom = response.room as any;
        teamRpsStates.value = {
          ...teamRpsStates.value,
          [roomId]: {
            roomId,
            mode: "team_rps_vote",
            status: rawRoom.status || "waiting",
            matchFormat: rawRoom.matchFormat,
            round: Number(rawRoom.round || 0),
            score: {
              A: Number(rawRoom.score?.A || 0),
              B: Number(rawRoom.score?.B || 0),
            },
            entryStake: Number(rawRoom.entryStake || 0),
            stake: Number(rawRoom.stake || 0),
            teams: {
              A: Array.isArray(rawRoom.teams?.A) ? rawRoom.teams.A : [],
              B: Array.isArray(rawRoom.teams?.B) ? rawRoom.teams.B : [],
            },
            teamCounts: {
              A: Number(rawRoom.teamCounts?.A || 0),
              B: Number(rawRoom.teamCounts?.B || 0),
            },
            inputEndsAt: rawRoom.inputEndsAt ?? null,
            hostUserId: rawRoom.hostUserId || "",
          },
        };
      }
    }

    return response.room;
  };

  const clearRoomRealtimeState = (roomId: string) => {
    const nextRoomDetails = { ...roomDetails.value };
    delete nextRoomDetails[roomId];
    roomDetails.value = nextRoomDetails;

    const nextTeamStates = { ...teamRpsStates.value };
    delete nextTeamStates[roomId];
    teamRpsStates.value = nextTeamStates;

    const nextSubmittedCounts = { ...teamRpsSubmittedCounts.value };
    delete nextSubmittedCounts[roomId];
    teamRpsSubmittedCounts.value = nextSubmittedCounts;

    const nextResolvedRounds = { ...teamRpsResolvedRounds.value };
    delete nextResolvedRounds[roomId];
    teamRpsResolvedRounds.value = nextResolvedRounds;

    const nextFinishedStates = { ...teamRpsFinishedStates.value };
    delete nextFinishedStates[roomId];
    teamRpsFinishedStates.value = nextFinishedStates;
  };

  const ensureSocket = async () => {
    if (!process.client) {
      throw new Error("Socket requires client runtime.");
    }
    if (!authToken.value) {
      throw new Error("Please login first.");
    }

    if (multiplayerSocket?.connected) return multiplayerSocket;

    if (!multiplayerSocket) {
      multiplayerSocket = io(socketOrigin.value, {
        path: "/socket.io",
        auth: { token: authToken.value },
        transports: ["websocket"],
      });
    } else {
      multiplayerSocket.auth = { token: authToken.value };
      multiplayerSocket.connect();
    }

    multiplayerSocket.off("lobby:rooms_updated");
    multiplayerSocket.on("lobby:rooms_updated", (payload: { mode?: MultiplayerMode; rooms?: MultiplayerRoomListItem[] }) => {
      if (payload?.mode && subscribedMode && payload.mode !== subscribedMode) return;
      if (Array.isArray(payload?.rooms)) {
        rooms.value = payload.rooms.map((room) => ({
          ...room,
          hostUserId: room.hostUserId || "",
          status: room.status || "waiting",
          maxPlayers: Number(room.maxPlayers || 0),
          players: Number(room.players || 0),
        }));
      }
    });

    multiplayerSocket.off("room:state");
    multiplayerSocket.on("room:state", (payload: any) => {
      if (!payload?.roomId) return;
      const previous = roomDetails.value[payload.roomId];
      roomDetails.value = {
        ...roomDetails.value,
        [payload.roomId]: {
          id: previous?.id || payload.roomId,
          name: previous?.name || "",
          mode: previous?.mode || "team_rps_vote",
          stake: previous?.stake || 0,
          entryStake: previous?.entryStake || 0,
          hostUserId: previous?.hostUserId || "",
          status: payload.status,
          stage: payload.stage,
          stageEndsAt: previous?.stageEndsAt || null,
          createdAt: previous?.createdAt,
          players: Array.isArray(payload.players) ? payload.players : previous?.players || [],
        },
      };

      if (payload.mode === "team_rps_vote") {
        teamRpsStates.value = {
          ...teamRpsStates.value,
          [payload.roomId]: {
            roomId: payload.roomId,
            mode: "team_rps_vote",
            status: payload.status || "waiting",
            matchFormat: payload.matchFormat,
            round: Number(payload.round || 0),
            score: {
              A: Number(payload.score?.A || 0),
              B: Number(payload.score?.B || 0),
            },
            entryStake: Number(payload.entryStake || previous?.entryStake || 0),
            stake: Number(payload.stake || previous?.stake || 0),
            teams: {
              A: Array.isArray(payload.teams?.A) ? payload.teams.A : [],
              B: Array.isArray(payload.teams?.B) ? payload.teams.B : [],
            },
            teamCounts: {
              A: Number(payload.teamCounts?.A || 0),
              B: Number(payload.teamCounts?.B || 0),
            },
            inputEndsAt: payload.inputEndsAt ?? null,
            hostUserId: payload.hostUserId || previous?.hostUserId || "",
          },
        };
      }
    });

    multiplayerSocket.off("team:updated");
    multiplayerSocket.on("team:updated", (payload: { roomId: string; teamCounts?: { A: number; B: number } }) => {
      const previous = teamRpsStates.value[payload.roomId];
      if (!previous) return;
      teamRpsStates.value = {
        ...teamRpsStates.value,
        [payload.roomId]: {
          ...previous,
          teamCounts: {
            A: Number(payload.teamCounts?.A || previous.teamCounts.A || 0),
            B: Number(payload.teamCounts?.B || previous.teamCounts.B || 0),
          },
        },
      };
    });

    multiplayerSocket.off("team_rps:round_started");
    multiplayerSocket.on("team_rps:round_started", (payload: { roomId: string; round: number; inputEndsAt: number }) => {
      const previous = teamRpsStates.value[payload.roomId];
      if (previous) {
        teamRpsStates.value = {
          ...teamRpsStates.value,
          [payload.roomId]: {
            ...previous,
            status: "playing",
            round: payload.round,
            inputEndsAt: payload.inputEndsAt,
          },
        };
      }
      const nextSubmittedCounts = { ...teamRpsSubmittedCounts.value };
      delete nextSubmittedCounts[payload.roomId];
      teamRpsSubmittedCounts.value = nextSubmittedCounts;

      const nextResolved = { ...teamRpsResolvedRounds.value };
      delete nextResolved[payload.roomId];
      teamRpsResolvedRounds.value = nextResolved;
    });

    multiplayerSocket.off("team_rps:submitted_count");
    multiplayerSocket.on("team_rps:submitted_count", (payload: TeamRpsSubmittedCount) => {
      teamRpsSubmittedCounts.value = {
        ...teamRpsSubmittedCounts.value,
        [payload.roomId]: payload,
      };
    });

    multiplayerSocket.off("team_rps:round_resolved");
    multiplayerSocket.on("team_rps:round_resolved", (payload: TeamRpsRoundResolved) => {
      teamRpsResolvedRounds.value = {
        ...teamRpsResolvedRounds.value,
        [payload.roomId]: payload,
      };
      const nextSubmittedCounts = { ...teamRpsSubmittedCounts.value };
      delete nextSubmittedCounts[payload.roomId];
      teamRpsSubmittedCounts.value = nextSubmittedCounts;

      const previous = teamRpsStates.value[payload.roomId];
      if (previous) {
        teamRpsStates.value = {
          ...teamRpsStates.value,
          [payload.roomId]: {
            ...previous,
            score: payload.score,
          },
        };
      }
    });

    multiplayerSocket.off("team_rps:finished");
    multiplayerSocket.on("team_rps:finished", (payload: TeamRpsFinished) => {
      teamRpsFinishedStates.value = {
        ...teamRpsFinishedStates.value,
        [payload.roomId]: payload,
      };
      const nextSubmittedCounts = { ...teamRpsSubmittedCounts.value };
      delete nextSubmittedCounts[payload.roomId];
      teamRpsSubmittedCounts.value = nextSubmittedCounts;
    });

    multiplayerSocket.off("team_rps:finished_draw");
    multiplayerSocket.on("team_rps:finished_draw", (payload: TeamRpsFinished) => {
      teamRpsFinishedStates.value = {
        ...teamRpsFinishedStates.value,
        [payload.roomId]: payload,
      };
      const nextSubmittedCounts = { ...teamRpsSubmittedCounts.value };
      delete nextSubmittedCounts[payload.roomId];
      teamRpsSubmittedCounts.value = nextSubmittedCounts;
    });

    await new Promise<void>((resolve, reject) => {
      if (!multiplayerSocket) {
        reject(new Error("Socket not initialized."));
        return;
      }

      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = (error: { message?: string }) => {
        cleanup();
        reject(new Error(error?.message || "Socket connection failed."));
      };
      const cleanup = () => {
        multiplayerSocket?.off("connect", onConnect);
        multiplayerSocket?.off("connect_error", onError);
      };

      multiplayerSocket.on("connect", onConnect);
      multiplayerSocket.on("connect_error", onError);

      if (!multiplayerSocket.connected) {
        multiplayerSocket.connect();
      } else {
        cleanup();
        resolve();
      }
    });

    return multiplayerSocket;
  };

  const subscribeLobby = async (mode: MultiplayerMode = "team_rps_vote") => {
    const socket = await ensureSocket();
    subscribedMode = mode;
    socket.emit("lobby:subscribe", { mode });
  };

  const joinRoom = async (roomId: string) => {
    const socket = await ensureSocket();

    return await new Promise<{ room: Partial<MultiplayerRoomDetail>; you?: MultiplayerRoomPlayer }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Join room timed out."));
      }, 8000);

      const onJoined = (payload: { room?: Partial<MultiplayerRoomDetail>; you?: MultiplayerRoomPlayer }) => {
        if (payload?.room?.id !== roomId) return;
        cleanup();
        resolve(payload);
      };

      const onSocketError = (error: { message?: string }) => {
        cleanup();
        reject(new Error(error?.message || "Unable to join room."));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        socket.off("room:joined", onJoined);
        socket.off("socket:error", onSocketError);
      };

      socket.on("room:joined", onJoined);
      socket.on("socket:error", onSocketError);
      socket.emit("room:join", { roomId });
    });
  };

  const chooseTeam = async (roomId: string, team: "A" | "B") => {
    const socket = await ensureSocket();
    socket.emit("team:choose", { roomId, team });
  };

  const startRoom = async (roomId: string) => {
    const socket = await ensureSocket();
    socket.emit("room:start", { roomId });
  };

  const submitTeamRpsVote = async (roomId: string, round: number, choice: "rock" | "paper" | "scissors") => {
    const socket = await ensureSocket();
    socket.emit("team_rps:submit_vote", { roomId, round, choice });
  };

  return {
    rooms,
    roomDetails,
    teamRpsStates,
    teamRpsSubmittedCounts,
    teamRpsResolvedRounds,
    teamRpsFinishedStates,
    refreshRooms,
    createRoom,
    fetchRoom,
    clearRoomRealtimeState,
    subscribeLobby,
    joinRoom,
    chooseTeam,
    startRoom,
    submitTeamRpsVote,
  };
};
