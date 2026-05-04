# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

ARG VITE_API_URL
ARG VITE_AI_URL
ARG VITE_AI_ENGINE_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AI_URL=$VITE_AI_URL
ENV VITE_AI_ENGINE_URL=$VITE_AI_ENGINE_URL

RUN npm run build

# ── Stage 2: serve with nginx ─────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing: all paths fall through to index.html
RUN printf 'server {\n  listen 3000;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / { try_files $uri $uri/ /index.html; }\n}\n' \
    > /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
