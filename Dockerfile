FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Optional: install Doppler + Sentry CLI
RUN apk add --no-cache curl bash gnupg ca-certificates \
 && curl -sLf --retry 3 --tlsv1.2 --proto "=https" \
     'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' \
     | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg \
 && echo "https://packages.doppler.com/public/cli/alpine/doppler.apk" >> /etc/apk/repositories \
 && apk add --no-cache doppler \
 && npm install -g @sentry/cli

# Use Doppler to     inject runtime secrets
EXPOSE 3000

# Healthcheck for Railway, Docker Compose, etc.
HEALTHCHECK CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

RUN npm run build

# Default command
CMD ["doppler", "run", "--", "node", "dist/main.js"]