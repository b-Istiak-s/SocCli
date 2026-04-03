# soccli

`soccli` is a terminal-first, protocol-aware CLI for real-time systems. Think of it as **curl for WebSocket ecosystems**.

It supports:

- Raw WebSocket
- Pusher / Laravel Reverb (Pusher protocol)
- Socket.IO (Engine.IO v4 websocket transport)
- GraphQL subscriptions (`graphql-transport-ws`)

The project is ESM-only, CLI-only, and designed for real-world deployments behind reverse proxies.

## Why soccli

Real systems are rarely exposed as `wss://host/` with simple defaults. In practice, you often need to split:

- public host and port
- websocket path
- query params
- auth endpoint for private channels
- protocol-specific options

`soccli` provides both:

1. **Simple mode** using a full URL
2. **Advanced mode** using independent endpoint fields (`--host`, `--port`, `--secure`, `--path`, `--query`)

## Install

```bash
npm install
npm link
```

Then run:

```bash
soccli --help
```

## Docker

Build the image:

```bash
docker build -t soccli .
```

Run help or any one-shot command exactly like the local CLI:

```bash
docker run --rm soccli --help
docker run --rm soccli raw connect --help
docker run --rm soccli pusher connect "wss://example.com/app/APP_KEY?protocol=7&client=soccli&version=0.1.0"
docker run --rm soccli socketio emit "wss://example.com/socket.io/?EIO=4&transport=websocket" --event message --data '{"text":"hello"}'
docker run --rm soccli graphql subscribe wss://example.com/graphql --query 'subscription { ping }'
```

For interactive sessions, allocate a TTY and keep stdin open:

```bash
docker run --rm -it soccli raw connect wss://example.com/websocket
docker run --rm -it soccli graphql connect wss://example.com/graphql
```

If the target service runs on your host machine, you may need Docker networking options or `host.docker.internal`, depending on your platform.

## Architecture

Layered, modular structure:

- `src/core/transport/websocket.js`: shared WebSocket transport lifecycle
- `src/core/raw/*`: raw protocol logic
- `src/core/pusher/*`: pusher handshake, channel auth/subscription
- `src/core/socketio/*`: Engine.IO and Socket.IO frame handling
- `src/core/graphql/*`: `graphql-transport-ws` init + subscription flow
- `src/cli/*`: command parsing, UX, interactive loop

## Global flags

- `-v, --verbose`
- `--debug`
- `--raw-frames`

Most commands also support repeated headers:

- `-H "Authorization: Bearer ..."`
- `-H "X-Foo: bar"`

## Connection model

### 1) Simple mode (full URL)

Examples:

```bash
soccli raw connect wss://example.com/websocket
soccli pusher connect wss://example.com/app/APP_KEY?protocol=7&client=js&version=8.4.0
soccli socketio connect "wss://example.com/socket.io/?EIO=4&transport=websocket"
soccli graphql connect wss://example.com/graphql
```

### 2) Advanced mode (independent config)

Examples:

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

This model exists specifically for proxied deployments (Nginx, Cloudflare, ingress, service meshes) where websocket and HTTP auth routes differ.

## Protocol usage

## Raw WebSocket

Connect and use interactive stdin/stdout:

```bash
soccli raw connect wss://echo.websocket.org
```

Advanced mode with custom headers/query:

```bash
soccli raw connect \
  --host example.com \
  --port 443 \
  --secure \
  --path /ws \
  --query token=abc \
  -H "Authorization: Bearer TOKEN"
```

## Pusher / Laravel Reverb

Connect only:

```bash
soccli pusher connect wss://example.com/app/APP_KEY?protocol=7&client=soccli&version=0.1.0
```

Subscribe public channel:

```bash
soccli pusher subscribe wss://example.com/app/APP_KEY?protocol=7&client=soccli&version=0.1.0 \
  --channel public-chat
```

Subscribe private channel with HTTP auth:

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

Manual override mode (when you already have auth payload):

```bash
soccli pusher subscribe ... \
  --auth-payload '{"auth":"APP_KEY:signature"}'
```

Manual signing mode:

```bash
soccli pusher subscribe ... \
  --app-key APP_KEY \
  --app-secret APP_SECRET
```

## Socket.IO

Connect:

```bash
soccli socketio connect "wss://example.com/socket.io/?EIO=4&transport=websocket"
```

Emit event:

```bash
soccli socketio emit "wss://example.com/socket.io/?EIO=4&transport=websocket" \
  --namespace /chat \
  --event message \
  --data '{"text":"hello"}'
```

Advanced mode:

```bash
soccli socketio emit \
  --host example.com \
  --port 443 \
  --secure \
  --path /realtime/socket.io/ \
  --namespace /chat \
  --event message \
  --data '{"text":"hello"}'
```

> Rooms are application-level behavior; `soccli` does not fake room support. Emit your server's join event if applicable.

## GraphQL subscriptions (`graphql-transport-ws`)

Connect + init only:

```bash
soccli graphql connect wss://example.com/graphql --init-payload '{"token":"abc"}'
```

Subscribe:

```bash
soccli graphql subscribe wss://example.com/graphql \
  --query 'subscription { messageAdded { id text } }' \
  --variables '{"roomId":1}'
```

Advanced mode:

```bash
soccli graphql subscribe \
  --host example.com \
  --port 443 \
  --secure \
  --path /graphql/subscriptions \
  --init-payload '{"Authorization":"Bearer TOKEN"}' \
  --query 'subscription { ping }'
```

## Interactive mode

After connecting, commands enter interactive mode:

- stdin lines are sent to the active protocol handler
- incoming messages are printed with timestamp + protocol label
- `/exit` or `/quit` closes the session

On unexpected disconnects, `soccli` exits non-zero.

## Limitations

- Socket.IO room membership is app-specific (not a transport primitive).
- Pusher private/presence channels require valid auth flow (HTTP auth, manual payload, or manual signing).
- This tool does not auto-detect protocol from URL.

## Development

```bash
npm install
npm run check
node ./bin/soccli.js --help
```

## License

MIT
