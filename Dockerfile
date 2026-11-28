FROM oven/bun:1.4.5 AS build
WORKDIR /app
COPY package.json bun.lock tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/cli/package.json apps/cli/
COPY apps/web/package.json apps/web/
COPY apps/oauth-broker/package.json apps/oauth-broker/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
RUN bun run build && bun build --compile --minify apps/api/src/index.ts --outfile /out/runelay-server

FROM debian:bookworm-slim
RUN groupadd --gid 1000 node && useradd --uid 1000 --gid node --no-create-home --shell /usr/sbin/nologin node
COPY --from=build /out/runelay-server /usr/local/bin/runelay-server
COPY --from=build /app/apps/web/dist /app/web
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
ENV NODE_ENV=production RUNELAY_DATA=/data HOST=0.0.0.0 PORT=4312 WEB_DIST=/app/web
VOLUME /data
EXPOSE 4312
HEALTHCHECK --interval=30s --timeout=5s CMD ["sh", "-c", "BUN_BE_BUN=1 runelay-server -e \"fetch('http://127.0.0.1:4312/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["runelay-server"]
