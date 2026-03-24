const wsBaseUrl = process.env.ADRENA_COMPETITION_SERVICE_WS_BASE_URL?.trim();
const apiKey = process.env.ADRENA_COMPETITION_SERVICE_API_KEY?.trim();
const appUrl = (process.env.COMPETITION_SERVICE_WORKER_APP_URL?.trim() ||
  "http://127.0.0.1:3000").replace(/\/+$/, "");
const reconnectBaseMs = Number(process.env.COMPETITION_SERVICE_WORKER_RECONNECT_BASE_MS || 1_000);
const reconnectMaxMs = Number(process.env.COMPETITION_SERVICE_WORKER_RECONNECT_MAX_MS || 15_000);
const requestTimeoutMs = Number(process.env.COMPETITION_SERVICE_WORKER_REQUEST_TIMEOUT_MS || 30_000);
const syncOnConnect = process.env.COMPETITION_SERVICE_WORKER_SYNC_ON_CONNECT !== "false";

if (!wsBaseUrl) {
  throw new Error("ADRENA_COMPETITION_SERVICE_WS_BASE_URL is required.");
}

if (!apiKey) {
  throw new Error("ADRENA_COMPETITION_SERVICE_API_KEY is required.");
}

const socketUrl = `${wsBaseUrl.replace(/\/+$/, "")}/${apiKey}`;
let websocket = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let shuttingDown = false;

function log(message, details) {
  if (details === undefined) {
    console.log(`[competition-service-worker] ${message}`);
    return;
  }

  console.log(`[competition-service-worker] ${message}`, details);
}

async function postJson(pathname, payload) {
  const response = await fetch(`${appUrl}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `POST ${pathname} failed with ${response.status}: ${json?.error ?? text.slice(0, 200)}`
    );
  }

  return json;
}

async function reportStreamStatus(status, extra = {}) {
  try {
    await postJson("/api/admin/competition/service/stream?worker=1", {
      status,
      reconnectAttempts,
      ...extra,
    });
  } catch (error) {
    log("failed to report stream status", error instanceof Error ? error.message : String(error));
  }
}

async function syncCompetitionService(force = false) {
  try {
    const payload = await postJson("/api/admin/competition/service/sync?worker=1", { force });
    log("synced competition service", {
      health: payload?.competitionService?.health?.status ?? "unknown",
      tiers: payload?.competitionService?.sizeMultiplier?.tiers?.length ?? 0,
    });
  } catch (error) {
    log("failed to sync competition service", error instanceof Error ? error.message : String(error));
  }
}

async function ingestCloseEvent(payload) {
  const response = await postJson("/api/admin/competition/service/close-events?worker=1", payload);
  const result = response?.result ?? null;

  if (result?.stored) {
    log("stored close_position event", {
      signature: result.event?.signature ?? null,
      wallet: result.event?.wallet ?? null,
      positionId: result.event?.positionId ?? null,
    });
    return;
  }

  if (result?.ignored) {
    log("ignored close_position event", {
      reason: result.reason ?? null,
      signature: result.event?.signature ?? null,
    });
    return;
  }

  log("processed close_position event with unexpected response", result);
}

async function handleMessage(data) {
  const message =
    typeof data === "string" ? data : Buffer.from(data).toString("utf8");
  let payload;

  try {
    payload = JSON.parse(message);
  } catch (error) {
    await reportStreamStatus("error", {
      errorMessage:
        error instanceof Error ? `Failed to parse WebSocket payload: ${error.message}` : "Failed to parse WebSocket payload.",
    });
    return;
  }

  if (payload?.type !== "close_position") {
    return;
  }

  try {
    await ingestCloseEvent(payload);
  } catch (error) {
    await reportStreamStatus("error", {
      errorMessage:
        error instanceof Error ? error.message : "Failed to ingest close_position payload.",
      lastSignature:
        payload?.raw && typeof payload.raw === "object" && payload.raw.signature
          ? String(payload.raw.signature)
          : null,
    });
  }
}

function scheduleReconnect(reason) {
  if (shuttingDown) {
    return;
  }

  reconnectAttempts += 1;
  const delay = Math.min(reconnectBaseMs * 2 ** Math.max(reconnectAttempts - 1, 0), reconnectMaxMs);

  void reportStreamStatus("disconnected", {
    errorMessage: reason,
  });

  log(`reconnecting in ${delay}ms`, reason);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connect();
  }, delay);
}

async function connect() {
  if (shuttingDown) {
    return;
  }

  await reportStreamStatus("connecting", {
    errorMessage: null,
  });

  websocket = new WebSocket(socketUrl);
  let closed = false;

  websocket.addEventListener("open", async () => {
    reconnectAttempts = 0;
    await reportStreamStatus("connected", {
      errorMessage: null,
    });
    log("connected", socketUrl);

    if (syncOnConnect) {
      await syncCompetitionService(false);
    }
  });

  websocket.addEventListener("message", (event) => {
    void handleMessage(event.data);
  });

  websocket.addEventListener("error", () => {
    void reportStreamStatus("error", {
      errorMessage: "WebSocket connection error.",
    });
  });

  websocket.addEventListener("close", (event) => {
    if (closed) {
      return;
    }

    closed = true;
    websocket = null;

    if (shuttingDown) {
      void reportStreamStatus("idle", {
        errorMessage: null,
        reconnectAttempts: 0,
      });
      return;
    }

    const reason = event.reason
      ? `WebSocket closed: ${event.reason}`
      : `WebSocket closed with code ${event.code}.`;

    scheduleReconnect(reason);
  });
}

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  log(`received ${signal}, shutting down`);

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (websocket && websocket.readyState < WebSocket.CLOSING) {
    websocket.close(1000, "worker shutdown");
  }

  void reportStreamStatus("idle", {
    reconnectAttempts: 0,
    errorMessage: null,
  }).finally(() => {
    setTimeout(() => process.exit(0), 100);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

log("starting worker", {
  appUrl,
  socketUrl,
  requestTimeoutMs,
  syncOnConnect,
});

void connect();
