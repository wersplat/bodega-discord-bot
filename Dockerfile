FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV GOOGLE_CREDS_JSON
ENV GOOGLE_CREDS_JSON=${GOOGLE_CREDS_JSON}

RUN npm run build

CMD ["node", "dist/main.js"]