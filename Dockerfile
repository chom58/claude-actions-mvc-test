# マルチステージビルドを使用したプロダクション用Dockerfile
# ステージ1: ビルドステージ
FROM node:18-alpine AS builder

# 必要なパッケージのインストール
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係のインストール（本番用のみ）
RUN npm ci --omit=dev

# アプリケーションのソースコードをコピー
COPY . .

# 不要なファイルを削除
RUN rm -rf \
    .git \
    .github \
    tests \
    e2e \
    *.md \
    .env.example \
    docker-compose*.yml \
    Dockerfile* \
    .dockerignore

# ステージ2: 実行ステージ
FROM node:18-alpine

# 必要最小限のパッケージのみインストール
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata

# タイムゾーンの設定
ENV TZ=Asia/Tokyo

WORKDIR /app

# ビルドステージから必要なファイルのみコピー
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts

# アプリケーション用ユーザーの作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 必要なディレクトリの作成と権限設定
RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs /app

# ユーザーを切り替え
USER nodejs

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/system/health || exit 1

# ポートの公開
EXPOSE 3000

# dumb-initを使用してプロセスを起動
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/app.js"]