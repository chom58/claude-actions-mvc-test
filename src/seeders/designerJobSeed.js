const { JobSite, DesignerJob, sequelize } = require('../models');

const jobSitesData = [
  {
    name: 'vivivit',
    domain: 'vivivit.jp',
    baseUrl: 'https://vivivit.jp',
    description: 'デザイナー・クリエイター専門の求人サイト',
    category: 'design_specialized',
    priority: 10,
    isActive: true
  },
  {
    name: 'デザイナーのお仕事',
    domain: 'designer-oshigoto.com',
    baseUrl: 'https://designer-oshigoto.com',
    description: 'デザイナー専門の転職・求人情報サイト',
    category: 'design_specialized',
    priority: 9,
    isActive: true
  },
  {
    name: 'リデザイナー',
    domain: 'redesigner.jp',
    baseUrl: 'https://redesigner.jp',
    description: 'デザイナーのためのキャリア支援サービス',
    category: 'design_specialized',
    priority: 8,
    isActive: true
  },
  {
    name: 'グラフィカルジョブ',
    domain: 'graphical-job.com',
    baseUrl: 'https://graphical-job.com',
    description: 'グラフィックデザイナー専門求人サイト',
    category: 'design_specialized',
    priority: 7,
    isActive: true
  },
  {
    name: 'クリナビ',
    domain: 'crinavi.jp',
    baseUrl: 'https://crinavi.jp',
    description: 'クリエイター・デザイナーの転職情報',
    category: 'creative_focused',
    priority: 6,
    isActive: true
  },
  {
    name: 'マイナビクリエイター',
    domain: 'mynavi-creator.jp',
    baseUrl: 'https://mynavi-creator.jp',
    description: 'マイナビが運営するクリエイター専門転職エージェント',
    category: 'general',
    priority: 9,
    isActive: true
  },
  {
    name: 'リクナビNEXT',
    domain: 'rikunabi.com',
    baseUrl: 'https://next.rikunabi.com',
    description: '日本最大級の転職サイト',
    category: 'general',
    priority: 8,
    isActive: true
  },
  {
    name: 'Wantedly',
    domain: 'wantedly.com',
    baseUrl: 'https://www.wantedly.com',
    description: 'シゴトでココロオドルひとのプラットフォーム',
    category: 'general',
    priority: 8,
    isActive: true
  },
  {
    name: 'レバテッククリエイター',
    domain: 'creator.levtech.jp',
    baseUrl: 'https://creator.levtech.jp',
    description: 'Web・ゲーム業界のクリエイター専門エージェント',
    category: 'creative_focused',
    priority: 7,
    isActive: true
  },
  {
    name: 'GREEN',
    domain: 'green-japan.com',
    baseUrl: 'https://www.green-japan.com',
    description: 'IT/Web業界の求人・転職情報サイト',
    category: 'general',
    priority: 6,
    isActive: true
  }
];

const designerJobsData = [
  {
    title: '【未経験歓迎】Webデザイナー募集 | 成長企業で一緒にブランドを作りませんか？',
    company: '株式会社クリエイティブワークス',
    description: '未経験から始められるWebデザイナーポジションです。先輩デザイナーによる丁寧な指導と、充実した研修制度でスキルアップを支援します。',
    originalUrl: 'https://vivivit.jp/jobs/12345',
    jobType: 'full_time',
    experienceLevel: 'entry_level',
    isExperienceWelcome: true,
    isNewGraduateWelcome: true,
    designCategories: ['web', 'ui_ux'],
    skills: ['HTML', 'CSS', 'Photoshop', 'Illustrator'],
    tools: ['Figma', 'Sketch', 'Adobe Creative Suite'],
    location: '東京都渋谷区',
    isRemoteOk: true,
    salaryMin: 22,
    salaryMax: 28,
    salaryType: 'monthly',
    benefits: ['社会保険完備', '交通費支給', 'リモートワーク可', '研修制度充実'],
    postedAt: new Date('2024-01-15'),
    status: 'approved',
    isActive: true,
    isFeatured: true,
    priority: 10,
    tags: ['未経験歓迎', '新卒歓迎', 'リモートOK', '研修充実']
  },
  {
    title: '新卒歓迎！グラフィックデザイナー | 大手広告代理店でのキャリアスタート',
    company: '株式会社アドクリエイト',
    description: '2024年新卒採用！大手クライアントの案件に携わりながら、グラフィックデザインの基礎からしっかり学べる環境です。',
    originalUrl: 'https://designer-oshigoto.com/jobs/67890',
    jobType: 'full_time',
    experienceLevel: 'entry_level',
    isExperienceWelcome: false,
    isNewGraduateWelcome: true,
    designCategories: ['graphic', 'branding'],
    skills: ['Illustrator', 'Photoshop', 'InDesign'],
    tools: ['Adobe Creative Suite', 'After Effects'],
    location: '東京都港区',
    isRemoteOk: false,
    salaryMin: 24,
    salaryMax: 30,
    salaryType: 'monthly',
    benefits: ['社会保険完備', '賞与年2回', '研修制度', '社員旅行'],
    postedAt: new Date('2024-01-20'),
    status: 'approved',
    isActive: true,
    isFeatured: true,
    priority: 9,
    tags: ['新卒歓迎', '大手企業', '研修充実', '広告業界']
  },
  {
    title: '【完全未経験OK】UI/UXデザイナー | スタートアップで一緒に成長しませんか？',
    company: '株式会社テックイノベーション',
    description: 'プログラミング経験不要！デザインに興味があれば大歓迎。小規模チームでじっくり学びながら成長できる環境です。',
    originalUrl: 'https://redesigner.jp/jobs/54321',
    jobType: 'full_time',
    experienceLevel: 'entry_level',
    isExperienceWelcome: true,
    isNewGraduateWelcome: true,
    designCategories: ['ui_ux', 'web'],
    skills: ['Figma', 'Sketch', 'ユーザーリサーチ'],
    tools: ['Figma', 'Sketch', 'Adobe XD', 'Miro'],
    location: '東京都新宿区',
    isRemoteOk: true,
    salaryMin: 25,
    salaryMax: 35,
    salaryType: 'monthly',
    benefits: ['フレックスタイム', 'リモートワーク可', '書籍購入支援', 'セミナー参加支援'],
    postedAt: new Date('2024-01-10'),
    status: 'approved',
    isActive: true,
    isFeatured: false,
    priority: 8,
    tags: ['未経験歓迎', 'スタートアップ', 'フレックス', 'UI/UX']
  },
  {
    title: '未経験からのWebデザイナー | 教育制度充実の制作会社',
    company: '株式会社デザインファクトリー',
    description: '未経験でも安心の3ヶ月研修プログラム付き。実案件を通じて実践的なスキルを身につけられます。',
    originalUrl: 'https://graphical-job.com/jobs/98765',
    jobType: 'full_time',
    experienceLevel: 'entry_level',
    isExperienceWelcome: true,
    isNewGraduateWelcome: false,
    designCategories: ['web', 'graphic'],
    skills: ['HTML', 'CSS', 'Photoshop', 'Illustrator', 'JavaScript'],
    tools: ['Adobe Creative Suite', 'VS Code', 'Git'],
    location: '大阪府大阪市',
    isRemoteOk: false,
    salaryMin: 20,
    salaryMax: 26,
    salaryType: 'monthly',
    benefits: ['社会保険完備', '交通費支給', '3ヶ月研修制度', '資格取得支援'],
    postedAt: new Date('2024-01-25'),
    status: 'approved',
    isActive: true,
    isFeatured: false,
    priority: 7,
    tags: ['未経験歓迎', '研修制度', '制作会社', '大阪']
  },
  {
    title: '【新卒・第二新卒歓迎】パッケージデザイナー | 老舗メーカーで安定キャリア',
    company: '株式会社パッケージクリエイト',
    description: '食品・化粧品のパッケージデザインを手がける老舗企業。安定した環境で長期的なキャリアを築けます。',
    originalUrl: 'https://crinavi.jp/jobs/11111',
    jobType: 'full_time',
    experienceLevel: 'entry_level',
    isExperienceWelcome: true,
    isNewGraduateWelcome: true,
    designCategories: ['package', 'graphic'],
    skills: ['Illustrator', 'Photoshop', '3D-CAD'],
    tools: ['Adobe Creative Suite', 'KeyShot', 'Blender'],
    location: '神奈川県横浜市',
    isRemoteOk: false,
    salaryMin: 23,
    salaryMax: 29,
    salaryType: 'monthly',
    benefits: ['社会保険完備', '退職金制度', '社内食堂', '年間休日120日'],
    postedAt: new Date('2024-01-18'),
    status: 'approved',
    isActive: true,
    isFeatured: false,
    priority: 6,
    tags: ['新卒歓迎', '第二新卒', '安定企業', 'パッケージデザイン']
  },
  {
    title: 'アニメーション未経験OK！モーショングラフィックデザイナー',
    company: '株式会社モーションクリエイト',
    description: 'After Effects未経験でも大丈夫！基礎から学べる環境で、動画コンテンツのデザインに挑戦しませんか？',
    originalUrl: 'https://mynavi-creator.jp/jobs/22222',
    jobType: 'full_time',
    experienceLevel: 'entry_level',
    isExperienceWelcome: true,
    isNewGraduateWelcome: true,
    designCategories: ['motion', 'video'],
    skills: ['After Effects', 'Premiere Pro', 'Illustrator'],
    tools: ['Adobe After Effects', 'Adobe Premiere Pro', 'Cinema 4D'],
    location: '東京都中野区',
    isRemoteOk: true,
    salaryMin: 26,
    salaryMax: 32,
    salaryType: 'monthly',
    benefits: ['フレックスタイム', 'リモートワーク可', '機材貸与', 'スキルアップ支援'],
    postedAt: new Date('2024-01-22'),
    status: 'approved',
    isActive: true,
    isFeatured: true,
    priority: 8,
    tags: ['未経験歓迎', 'モーション', 'After Effects', 'リモートOK']
  },
  {
    title: '【未経験歓迎】ECサイトデザイナー | 急成長中のD2Cブランド',
    company: '株式会社D2Cブランド',
    description: 'ECサイトのデザイン・運営に興味がある方大歓迎！売上に直結するデザインの楽しさを体験できます。',
    originalUrl: 'https://next.rikunabi.com/jobs/33333',
    jobType: 'full_time',
    experienceLevel: 'entry_level',
    isExperienceWelcome: true,
    isNewGraduateWelcome: false,
    designCategories: ['web', 'ec'],
    skills: ['Photoshop', 'HTML', 'CSS', 'Shopify'],
    tools: ['Adobe Creative Suite', 'Shopify', 'Canva'],
    location: '東京都世田谷区',
    isRemoteOk: true,
    salaryMin: 24,
    salaryMax: 30,
    salaryType: 'monthly',
    benefits: ['リモートワーク可', '成果報酬制度', '社割制度', '自由な服装'],
    postedAt: new Date('2024-01-12'),
    status: 'approved',
    isActive: true,
    isFeatured: false,
    priority: 7,
    tags: ['未経験歓迎', 'ECサイト', 'D2C', 'Shopify']
  },
  {
    title: '新卒募集！ゲームUIデザイナー | 人気ゲーム開発会社',
    company: '株式会社ゲームスタジオ',
    description: '2024年新卒採用！人気スマホゲームのUIデザインを担当。ゲーム好きな方、大歓迎です！',
    originalUrl: 'https://www.wantedly.com/jobs/44444',
    jobType: 'full_time',
    experienceLevel: 'entry_level',
    isExperienceWelcome: false,
    isNewGraduateWelcome: true,
    designCategories: ['ui_ux', 'game'],
    skills: ['Photoshop', 'Illustrator', 'Unity'],
    tools: ['Adobe Creative Suite', 'Unity', 'Figma'],
    location: '東京都品川区',
    isRemoteOk: false,
    salaryMin: 28,
    salaryMax: 35,
    salaryType: 'monthly',
    benefits: ['社会保険完備', 'ゲーム支給', '社内イベント', '最新機材'],
    postedAt: new Date('2024-01-08'),
    status: 'approved',
    isActive: true,
    isFeatured: true,
    priority: 9,
    tags: ['新卒歓迎', 'ゲーム業界', 'UI', 'Unity']
  }
];

async function seedDesignerJobs() {
  try {
    console.log('🎨 デザイナー求人メディアのシードデータを開始...');

    // トランザクション開始
    const transaction = await sequelize.transaction();

    try {
      // 既存のデータをクリア
      await DesignerJob.destroy({ where: {}, transaction });
      await JobSite.destroy({ where: {}, transaction });

      console.log('✨ 既存データをクリアしました');

      // 求人サイトデータを作成
      const createdJobSites = await JobSite.bulkCreate(jobSitesData, { 
        transaction,
        returning: true 
      });

      console.log(`✅ ${createdJobSites.length}件の求人サイトを作成しました`);

      // 求人データに求人サイトIDを割り当て
      const updatedJobsData = designerJobsData.map((job, index) => ({
        ...job,
        jobSiteId: createdJobSites[index % createdJobSites.length].id
      }));

      // 求人データを作成
      const createdJobs = await DesignerJob.bulkCreate(updatedJobsData, { 
        transaction,
        returning: true 
      });

      console.log(`✅ ${createdJobs.length}件の求人を作成しました`);

      // 統計を表示
      const stats = {
        totalJobs: createdJobs.length,
        experienceWelcome: createdJobs.filter(job => job.isExperienceWelcome).length,
        newGraduateWelcome: createdJobs.filter(job => job.isNewGraduateWelcome).length,
        featured: createdJobs.filter(job => job.isFeatured).length,
        remoteOk: createdJobs.filter(job => job.isRemoteOk).length
      };

      console.log('\n📊 作成されたデータの統計:');
      console.log(`   総求人数: ${stats.totalJobs}`);
      console.log(`   未経験歓迎: ${stats.experienceWelcome}`);
      console.log(`   新卒歓迎: ${stats.newGraduateWelcome}`);
      console.log(`   おすすめ求人: ${stats.featured}`);
      console.log(`   リモートOK: ${stats.remoteOk}`);

      // トランザクションをコミット
      await transaction.commit();

      console.log('\n🎉 デザイナー求人メディアのシードデータ作成完了！');
      
      return {
        jobSites: createdJobSites,
        jobs: createdJobs,
        stats
      };

    } catch (error) {
      // エラーが発生した場合はロールバック
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ シードデータ作成中にエラーが発生しました:', error);
    throw error;
  }
}

// 直接実行された場合のみシードを実行
if (require.main === module) {
  seedDesignerJobs()
    .then(() => {
      console.log('✨ シードデータ作成完了');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ シードデータ作成失敗:', error);
      process.exit(1);
    });
}

module.exports = { seedDesignerJobs };