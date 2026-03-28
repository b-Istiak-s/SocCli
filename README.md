# soccli

`soccli` is a terminal-first real-time protocol CLI for developers who need a **curl-like workflow for WebSockets and subscription protocols** in real-world environments.

Supported protocols:

1. Raw WebSocket
2. Pusher / Laravel Reverb (Pusher protocol)
3. Socket.IO (Engine.IO websocket transport)
4. GraphQL subscriptions (`graphql-transport-ws`)

> Designed for real deployments behind reverse proxies where socket host/port/path/auth endpoints are often independent.

---

## Why soccli

Real systems are not always at `wss://example.com/`:

- WebSocket endpoint path may be `/websocket` or `/app/{key}`
- Public host can hide an internal socket port
- Auth endpoint may be on different host/path from the websocket endpoint
- Socket.IO may live on a non-default path
- GraphQL websocket endpoint may differ from HTTP GraphQL endpoint

`soccli` supports:

- **Simple mode** for fast testing with a full URL
- **Advanced mode** for production-like setups with host/port/path/query/header/auth split flags

---

## Install

```bash
npm install
npm link
soccli --help
```

Node.js 20+ is required.

---

## CLI overview

```bash
soccli raw ...
soccli pusher ...
soccli socketio ...
soccli graphql ...
```

Each protocol command supports:

- multiple `--header "Key: Value"`
- interactive mode (`stdin` -> send, `stdout` -> receive)
- `--verbose` and `--debug`
- optional `--raw-frames`

---

## Connection model

### 1) Simple mode (full URL)

Provide complete endpoint directly.

```bash
soccli raw connect wss://example.com/websocket
soccli pusher connect wss://example.com/app/APP_KEY?protocol=7&client=js
soccli socketio connect 'wss://example.com/socket.io/?EIO=4&transport=websocket'
soccli graphql connect wss://example.com/graphql
```

### 2) Advanced mode (separated fields)

Provide host/port/path/query/auth independently.

```bash
soccli pusher subscribe \
  --host example.com \
  --port 443 \
  --secure \
  --path /app/APP_KEY \
  --query protocol=7 \
  --query client=soccli \
  --query version=0.1.0 \
  --channel private-users.1 \
  --auth-endpoint https://example.com/api/broadcasting/auth \
  --auth-header "Authorization: Bearer TOKEN" \
  --header "X-Forwarded-Proto: https"
```

---

## Protocol usage

## Raw WebSocket

### Connect and interact

```bash
soccli raw connect wss://example.com/websocket
```

Type lines in terminal to send frames.
Use `/exit` or `/quit` to close.

### Advanced mode

```bash
soccli raw connect \
  --host example.com \
  --port 443 \
  --secure \
  --path /ws \
  --query token=abc \
  --header "Authorization: Bearer TOKEN"
```

---

## Pusher / Laravel Reverb

### Subscribe public channel

```bash
soccli pusher subscribe wss://example.com/app/APP_KEY?protocol=7&client=soccli&version=0.1.0 \
  --channel public-notifications
```

### Subscribe private channel via auth endpoint

```bash
soccli pusher subscribe \
  --host example.com \
  --secure \
  --path /app/APP_KEY \
  --query protocol=7 \
  --query client=soccli \
  --query version=0.1.0 \
  --channel private-users.1 \
  --auth-endpoint https://example.com/broadcasting/auth \
  --auth-header "Authorization: Bearer TOKEN"
```

### Manual authorizer override

```bash
soccli pusher subscribe wss://example.com/app/APP_KEY?protocol=7&client=soccli&version=0.1.0 \
  --channel private-users.1 \
  --auth "APP_KEY:computed_signature"
```

### Trigger from interactive mode

After connect/subscribe:

```text
/trigger client-message my-channel {"text":"hi"}
```

---

## Socket.IO

### Connect to Engine.IO websocket

```bash
soccli socketio connect 'wss://example.com/socket.io/?EIO=4&transport=websocket'
```

### Emit event

```bash
soccli socketio emit 'wss://example.com/socket.io/?EIO=4&transport=websocket' \
  --namespace /chat \
  --event message \
  --data '{"text":"hello"}'
```

### Advanced mode with non-default path

```bash
soccli socketio connect \
  --host example.com \
  --secure \
  --path /rt/socket.io/ \
  --query EIO=4 \
  --query transport=websocket \
  --namespace /chat
```

### Socket.IO room note (important)

Rooms are application-level behavior. `soccli` does not fake room support. Join/leave room behavior must be implemented by your server events; use `emit`/interactive frames to invoke those events.

---

## GraphQL subscriptions (`graphql-transport-ws`)

### Subscribe

```bash
soccli graphql subscribe wss://example.com/graphql \
  --query 'subscription OnMessage { messageCreated { id text } }'
```

### With init payload and variables

```bash
soccli graphql subscribe \
  --host example.com \
  --secure \
  --path /graphql/ws \
  --header "Authorization: Bearer TOKEN" \
  --init-payload '{"token":"abc"}' \
  --query 'subscription OnMessage($room: ID!) { messageCreated(room: $room) { id text } }' \
  --variables '{"room":"general"}'
```

In interactive mode, use `/complete` to complete the active subscription.

---

## Interactive mode behavior

- Incoming frames are printed with timestamp and direction marker
- Outgoing frames are printed before send
- `/exit` and `/quit` close the session
- Unexpected disconnects set non-zero exit status

---

## Architecture

### Layer 1: Transport (`src/core/transport/websocket.js`)

- open/close websocket (ws/wss)
- headers and TLS options
- send/receive frames
- lifecycle and disconnect errors

### Layer 2: Protocol modules

- `src/core/raw/*`
- `src/core/pusher/*`
- `src/core/socketio/*`
- `src/core/graphql/*`

Each protocol encapsulates handshake/framing/parsing/auth/protocol behavior.

### Layer 3: CLI (`src/cli/*`)

- command parsing
- simple vs advanced connection construction
- protocol commands
- interactive terminal loops

---

## Limitations

- No auto-protocol detection (intentional)
- Socket.IO rooms are server-defined and not natively discoverable by protocol clients
- `graphql-transport-ws` only (legacy `subscriptions-transport-ws` is not implemented)

---

## License

MIT
