FROM node:18-alpine

# 作業ディレクトリの設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm ci --only=production

# アプリケーションのソースコードをコピー
COPY . .

# アプリケーション用ユーザーの作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# ログディレクトリの作成と権限設定
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# ユーザーを切り替え
USER nodejs

# ポートの公開
EXPOSE 3000

# アプリケーションの起動
CMD ["node", "src/app.js"]