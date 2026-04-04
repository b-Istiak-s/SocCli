FROM node:20.20.2-alpine3.22

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY bin ./bin
COPY src ./src

ENTRYPOINT ["node", "/app/bin/soccli.js"]
