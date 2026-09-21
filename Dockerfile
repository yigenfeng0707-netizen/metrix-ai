# Metrix AI — ModelScope Docker Studio
# Public process must listen 0.0.0.0:7860 (platform reserves 8080)
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Same-origin: browser never talks to :8787
ENV NEXT_PUBLIC_AGENT_URL=

COPY package.json package-lock.json ./
COPY apps/agent/package.json apps/agent/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --no-audit

COPY packages/shared packages/shared
COPY apps/agent apps/agent
COPY apps/web apps/web
RUN npm run build -w apps/web

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_AGENT_URL= AGENT_MODE=sim
COPY --from=builder /app /app
COPY entrypoint.sh studio-proxy.mjs deploy_version.txt /app/
RUN chmod +x /app/entrypoint.sh
EXPOSE 7860
CMD ["/app/entrypoint.sh"]
