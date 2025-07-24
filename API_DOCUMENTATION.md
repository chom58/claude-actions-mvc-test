# 原宿クリエイティブコミュニティAPI ドキュメント

## 概要
このAPIは原宿クリエイティブコミュニティプラットフォームのバックエンドAPIです。
アパレルブランド、デザイン会社、クリエイティブイベント、コラボレーション、マッチングリクエストなどのリソースを管理します。

## ベースURL
```
http://localhost:3001/api
```

## エンドポイント一覧

### アパレルブランド (Apparel Brands)
- `GET /apparel-brands` - すべてのアパレルブランドを取得
- `GET /apparel-brands/:id` - 特定のアパレルブランドを取得
- `POST /apparel-brands` - 新しいアパレルブランドを作成
- `PUT /apparel-brands/:id` - アパレルブランド情報を更新
- `DELETE /apparel-brands/:id` - アパレルブランドを削除

### デザイン会社 (Design Companies)
- `GET /design-companies` - すべてのデザイン会社を取得
- `GET /design-companies/:id` - 特定のデザイン会社を取得
- `POST /design-companies` - 新しいデザイン会社を作成
- `PUT /design-companies/:id` - デザイン会社情報を更新
- `DELETE /design-companies/:id` - デザイン会社を削除

### クリエイティブイベント (Creative Events)
- `GET /creative-events` - すべてのクリエイティブイベントを取得
- `GET /creative-events/:id` - 特定のクリエイティブイベントを取得
- `POST /creative-events` - 新しいクリエイティブイベントを作成
- `PUT /creative-events/:id` - クリエイティブイベント情報を更新
- `DELETE /creative-events/:id` - クリエイティブイベントを削除

### コラボレーション (Collaborations)
- `GET /collaborations` - すべてのコラボレーションを取得
- `GET /collaborations/:id` - 特定のコラボレーションを取得
- `POST /collaborations` - 新しいコラボレーションを作成
- `PUT /collaborations/:id` - コラボレーション情報を更新
- `DELETE /collaborations/:id` - コラボレーションを削除

### マッチングリクエスト (Matching Requests)
- `GET /matching-requests` - すべてのマッチングリクエストを取得
- `GET /matching-requests/:id` - 特定のマッチングリクエストを取得
- `POST /matching-requests` - 新しいマッチングリクエストを作成
- `PUT /matching-requests/:id` - マッチングリクエスト情報を更新
- `DELETE /matching-requests/:id` - マッチングリクエストを削除

## レスポンス形式
すべてのAPIレスポンスは以下のJSON形式で返されます：

### 成功時
```json
{
  "status": "success",
  "data": {
    // リソースデータ
  }
}
```

### エラー時
```json
{
  "status": "error",
  "message": "エラーメッセージ"
}
```

## HTTPステータスコード
- `200 OK` - リクエスト成功
- `201 Created` - リソース作成成功
- `400 Bad Request` - 不正なリクエスト
- `404 Not Found` - リソースが見つからない
- `500 Internal Server Error` - サーバーエラー