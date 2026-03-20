FROM node:22-slim

WORKDIR /app

ENV TZ=Asia/Phnom_Penh
ENV NODE_ENV=production
ENV PM2_HOME=/app/.pm2

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 make g++ git curl tzdata && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g pm2

COPY package*.json ./
RUN npm install --build-from-source && \
    npm cache clean --force

COPY . .

# Create user AND the pm2 dir with correct ownership
RUN useradd -r -s /bin/false appuser && \
    mkdir -p /app/.pm2 && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

CMD ["pm2-runtime", "ecosystem.config.js"]