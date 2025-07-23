require('dotenv').config();
const { User, Post, sequelize } = require('../models');
const { seedCreativeCommunity } = require('./creativeCommunitySeed');

const seedData = async () => {
  try {
    console.log('🌱 シードデータの投入を開始します...');

    // データベースをリセット
    await sequelize.sync({ force: true });
    console.log('✅ データベースをリセットしました');

    // ユーザーデータ
    const users = await User.bulkCreate([
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'Admin123!'
      },
      {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'Password123!'
      },
      {
        username: 'jane_smith',
        email: 'jane@example.com',
        password: 'Password123!'
      },
      {
        username: 'test_user',
        email: 'test@example.com',
        password: 'Test123!'
      }
    ], { individualHooks: true });

    console.log(`✅ ${users.length}人のユーザーを作成しました`);

    // 投稿データ
    const posts = [];
    const postTitles = [
      'はじめてのブログ投稿',
      'Node.jsとExpress.jsの基礎',
      'MVCパターンの実装方法',
      'Sequelizeでデータベース操作',
      'JWT認証の実装',
      'RESTful APIの設計',
      'テスト駆動開発のすすめ',
      'Dockerで開発環境構築',
      'GitHubActionsでCI/CD',
      'パフォーマンス最適化のコツ'
    ];

    for (let i = 0; i < postTitles.length; i++) {
      const userId = users[Math.floor(Math.random() * users.length)].id;
      const published = Math.random() > 0.3; // 70%の確率で公開

      posts.push({
        title: postTitles[i],
        content: `これは「${postTitles[i]}」についての記事です。\n\n` +
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
          'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
          'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris ' +
          'nisi ut aliquip ex ea commodo consequat.\n\n' +
          '## セクション1\n' +
          'Duis aute irure dolor in reprehenderit in voluptate velit esse ' +
          'cillum dolore eu fugiat nulla pariatur.\n\n' +
          '## セクション2\n' +
          'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui ' +
          'officia deserunt mollit anim id est laborum.',
        userId,
        published,
        publishedAt: published ? new Date() : null,
        viewCount: Math.floor(Math.random() * 1000)
      });
    }

    await Post.bulkCreate(posts);
    console.log(`✅ ${posts.length}件の投稿を作成しました`);

    // 原宿クリエイティブコミュニティデータの投入
    console.log('\n🎨 原宿クリエイティブコミュニティデータを投入中...');
    const creativeData = await seedCreativeCommunity();

    console.log('\n🎉 シードデータの投入が完了しました！');
    console.log('\n📝 作成されたユーザー:');
    users.forEach(user => {
      console.log(`   - ${user.username} (${user.email})`);
    });
    console.log('\n🎨 クリエイティブコミュニティデータ:');
    console.log(`   - デザイン会社: ${creativeData.designCompanies.length}社`);
    console.log(`   - アパレルブランド: ${creativeData.apparelBrands.length}ブランド`);
    console.log(`   - イベント: ${creativeData.events.length}件`);
    console.log(`   - コラボレーション: ${creativeData.collaborations.length}件`);
    console.log(`   - マッチングリクエスト: ${creativeData.matchingRequests.length}件`);
    console.log('\n💡 全てのユーザーのパスワードは元のパスワードを使用してください');

  } catch (error) {
    console.error('❌ シードデータの投入中にエラーが発生しました:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// スクリプトとして実行された場合
if (require.main === module) {
  seedData();
}

module.exports = seedData;