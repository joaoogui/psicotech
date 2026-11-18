FROM node:22-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/data
WORKDIR /app
COPY --chown=node:node package.json server.mjs db.mjs schema.sql admin.mjs ./
COPY --chown=node:node index.html styles.css script.js app.js app.css logo.png logo2.png logo-small.png ./
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
VOLUME /data
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
