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
- AMQP (via brokers like RabbitMQ)
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
9. **AMQP over WS** ⚠️ (possible via broker bridges/plugins, lower portability)

## 3) Popularity-ordered WebSocket protocol priorities

Ordered by broad ecosystem adoption / production usage patterns (general industry trend):

1. **Socket.IO** (already implemented)
2. **GraphQL Subscriptions over WebSocket** (already implemented)
3. **SignalR** (implemented in this phase)
4. **STOMP over WebSocket** (implemented in this phase)
5. **MQTT over WebSocket** (implemented in this phase)
6. **JSON-RPC over WebSocket** (implemented in this phase)
7. **WAMP** (implemented in this phase)
8. **AMQP over WebSocket bridges** (deferred)

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
3. Evaluate AMQP-over-WS plugin compatibility matrix by broker.
