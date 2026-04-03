# WebSocket Protocol Expansion Plan

## 1) Current architecture (as implemented)

`soccli` uses a layered architecture that is already modular:

- **Transport layer**: `src/core/transport/websocket.js`
  - shared connection lifecycle (`connect`, `send`, close handling, unexpected close errors)
  - shared URL builder (`buildWebSocketUrl`) for full URL and advanced host/port/path/query mode
- **Protocol core layer**: `src/core/<protocol>/...`
  - protocol-specific framing, handshake, and message parsing
- **CLI command layer**: `src/cli/commands/<protocol>/index.js`
  - commander command registration
  - endpoint option parsing and interactive prompt UX
- **Utility layer**: `src/utils/*`
  - headers/query parsing, logger, output formatting, interactive stdin loop

This makes it straightforward to add new protocols by creating one core module + one CLI command module, while reusing the same transport and prompt/runtime behavior.

## 2) Filter requested protocols to **WebSocket-only** scope

Requested list from product discussion:

- HTTP REST (HTTP/1.1, HTTP/2)
- WebSocket (custom JSON protocols)
- Server-Sent Events (SSE)
- gRPC (HTTP/2 + Protobuf)
- MQTT
- Kafka Protocol (via Apache Kafka)
- Socket.IO protocol
- SignalR
- GraphQL Subscriptions (WebSocket/SSE)
- JSON-RPC (over HTTP/WebSocket)
- STOMP
- WAMP

### Remove from WebSocket-only implementation scope

These are not WebSocket-native protocol targets for this CLI scope:

1. **HTTP REST** (request/response HTTP, not WebSocket)
2. **SSE** (HTTP event-stream, not WebSocket)
3. **gRPC** (HTTP/2 + Protobuf, not WebSocket)
4. **Kafka protocol** (native Kafka TCP protocol, not WebSocket)

### Keep for WebSocket implementation scope

1. **WebSocket (custom JSON/text)** ✅ (already covered by `raw`)
2. **Socket.IO** ✅ (already covered)
3. **GraphQL Subscriptions over WS** ✅ (already covered)
4. **JSON-RPC over WS** ✅ (added)
5. **STOMP over WS** ✅ (added)
6. **SignalR over WS** ✅ (added)
7. **WAMP over WS** ✅ (added)
8. **MQTT over WS** ✅ (added)

## 3) Popularity-ordered WebSocket protocol priorities

Ordered by broad ecosystem adoption / production usage patterns (general industry trend):

1. **Socket.IO** (already implemented)
2. **GraphQL Subscriptions over WebSocket** (already implemented)
3. **SignalR** (implemented in this phase)
4. **STOMP over WebSocket** (implemented in this phase)
5. **MQTT over WebSocket** (implemented in this phase)
6. **JSON-RPC over WebSocket** (implemented in this phase)
7. **WAMP** (implemented in this phase)

## 4) What was built in this phase

New modular protocol support added:

- `jsonrpc` command + core client module
- `stomp` command + core frame/client modules
- `signalr` command + core client module
- `mqtt` command + core codec/client modules
- `wamp` command + core client module

All follow existing architecture:

- Reuse shared WebSocket transport
- Keep protocol logic inside `src/core/<protocol>`
- Keep CLI UX/flags inside `src/cli/commands/<protocol>`
- Keep interactive mode behavior consistent with existing commands

## 5) Next incremental build plan

1. Add protocol conformance fixtures for new frame parsers/builders.
2. Add protocol capability matrix docs and examples per protocol.

## 6) How to handle each protocol in `soccli`

Below are practical command patterns for each currently supported protocol.

### Raw WebSocket

```bash
soccli raw connect wss://example.com/ws
```

```bash
soccli raw connect \
  --host example.com \
  --port 443 \
  --secure \
  --path /ws \
  --query token=abc \
  -H "Authorization: Bearer TOKEN"
```

### Pusher / Laravel Reverb

```bash
soccli pusher subscribe \
  --host example.com \
  --port 443 \
  --secure \
  --path /app/APP_KEY \
  --channel private-users.1 \
  --auth-endpoint https://example.com/api/broadcasting/auth \
  --auth-header "Authorization: Bearer TOKEN"
```

### Socket.IO

```bash
soccli socketio emit \
  --host example.com \
  --port 443 \
  --secure \
  --path /socket.io/ \
  --namespace /chat \
  --event message \
  --data '{"text":"hello"}'
```

### GraphQL subscriptions (`graphql-transport-ws`)

```bash
soccli graphql subscribe \
  --host example.com \
  --port 443 \
  --secure \
  --path /graphql \
  --init-payload '{"Authorization":"Bearer TOKEN"}' \
  --query 'subscription { messageAdded { id text } }'
```

### JSON-RPC over WebSocket

```bash
soccli jsonrpc call \
  --host example.com \
  --port 443 \
  --secure \
  --path /rpc \
  --method user.get \
  --params '{"id": 42}'
```

Interactive `jsonrpc connect` accepts either:
- full JSON-RPC request object (`{"method":"x","params":{},"id":1}`)
- notification object (`{"method":"x","params":{}}`)

### STOMP over WebSocket

```bash
soccli stomp subscribe \
  --host example.com \
  --port 443 \
  --secure \
  --path /ws \
  --vhost / \
  --login app \
  --passcode secret \
  --destination /topic/updates
```

Interactive `stomp` mode:
- JSON with `{ "id": "..." }` sends ACK
- plain text sends `SEND` to the selected destination

### SignalR over WebSocket

```bash
soccli signalr invoke \
  --host example.com \
  --port 443 \
  --secure \
  --path /hub/chat \
  --target SendMessage \
  --args '["hello", "world"]' \
  -H "Authorization: Bearer TOKEN"
```

`signalr connect` sends handshake automatically, then interactive mode can send raw SignalR payloads or JSON with `target`.

### MQTT over WebSocket

```bash
soccli mqtt subscribe \
  --host example.com \
  --port 443 \
  --secure \
  --path /mqtt \
  --client-id soccli-client \
  --username app \
  --password secret \
  --topic sensors/temperature
```

Interactive `mqtt connect` supports JSON actions:
- `{"action":"subscribe","topic":"a/b"}`
- `{"action":"publish","topic":"a/b","payload":"hello"}`
- `{"action":"ping"}`

### WAMP over WebSocket

```bash
soccli wamp call \
  --host example.com \
  --port 443 \
  --secure \
  --path /ws \
  --realm realm1 \
  --procedure com.example.sum \
  --args '[1,2,3]'
```

```bash
soccli wamp subscribe \
  --host example.com \
  --port 443 \
  --secure \
  --path /ws \
  --realm realm1 \
  --topic com.example.topic
```

Interactive `wamp connect` supports JSON actions:
- `{"action":"subscribe","topic":"com.example.topic"}`
- `{"action":"publish","topic":"com.example.topic","args":["hi"]}`
- `{"action":"call","procedure":"com.example.echo","args":["hello"]}`
