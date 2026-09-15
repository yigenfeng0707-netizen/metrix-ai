# 构建上下文 = 仓库根（monorepo workspaces 需要完整依赖树）
FROM node:22-alpine
WORKDIR /app

# 只复制依赖清单，最大化层缓存
COPY package.json package-lock.json* ./
COPY apps/agent/package.json apps/agent/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm install --no-audit --no-fund

COPY packages/shared packages/shared
COPY apps/agent apps/agent
RUN npm run typecheck -w apps/agent

EXPOSE 8787
CMD ["npm", "run", "start", "-w", "apps/agent"]
