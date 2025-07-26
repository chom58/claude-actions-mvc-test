# クリーンアップ計画

## 基本MVCテンプレートに残すファイル

### コアファイル
- src/app.js
- src/config/database.js
- src/config/env.js
- src/config/session.js

### 基本モデル
- src/models/index.js
- src/models/User.js
- src/models/Post.js

### 基本コントローラー
- src/controllers/userController.js
- src/controllers/postController.js

### 基本ルート
- src/routes/index.js
- src/routes/userRoutes.js
- src/routes/postRoutes.js

### 基本ミドルウェア
- src/middleware/auth.js
- src/middleware/errorHandler.js
- src/middleware/security.js
- src/middleware/rateLimit.js
- src/middleware/csrf.js

### 改善されたミドルウェア
- src/middleware/errorHandler.improved.js
- src/middleware/security.improved.js
- src/middleware/rateLimit.improved.js

### ユーティリティ
- src/utils/asyncHandler.js
- src/utils/errorTypes.js
- src/utils/logger.js
- src/utils/pagination.js
- src/utils/validation.js

### 公開ファイル
- public/index.html
- public/login.html
- public/register.html

## デザイナー求人サイトに移動するファイル

### モデル
- src/models/DesignerJob.js
- src/models/JobSite.js

### コントローラー
- src/controllers/designerJobController.js
- src/controllers/jobSiteController.js

### ルート
- src/routes/designerJobRoutes.js
- src/routes/jobSiteRoutes.js

### シーダー
- src/seeders/designerJobSeed.js

## 原宿クリエイティブコミュニティに移動するファイル

### モデル
- src/models/CreativeEvent.js
- src/models/DesignCompany.js
- src/models/ApparelBrand.js
- src/models/Collaboration.js
- src/models/MatchingRequest.js

### コントローラー
- src/controllers/creativeEventController.js
- src/controllers/designCompanyController.js
- src/controllers/apparelBrandController.js
- src/controllers/collaborationController.js
- src/controllers/matchingController.js

### ルート
- src/routes/creativeEventRoutes.js
- src/routes/designCompanyRoutes.js
- src/routes/apparelBrandRoutes.js
- src/routes/collaborationRoutes.js
- src/routes/matchingRoutes.js

### シーダー
- src/seeders/creativeCommunitySeed.js

## 削除対象（重複または不要）
- src/routes/userRoutes.improved.js （改善版は別管理）
- WebSocket関連（各プロジェクトで必要に応じて実装）
- チャット関連（各プロジェクトで必要に応じて実装）