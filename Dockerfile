FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Optional: install Doppler + Sentry CLI
RUN wget -q -t3 'https://packages.doppler.com/public/cli/rsa.8004D9FF50437357.key' -O /etc/apk/keys/cli@doppler-8004D9FF50437357.rsa.pub \
 && echo 'https://packages.doppler.com/public/cli/alpine/any-version/main' >> /etc/apk/repositories \
 && apk add --no-cache doppler \
 && npm install -g @sentry/cli


# Use Doppler to     inject runtime secrets
EXPOSE 3000

# Healthcheck for Railway, Docker Compose, etc.
HEALTHCHECK CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

RUN npm run build

# Default command
CMD ["doppler", "run", "--", "node", "dist/main.js"]