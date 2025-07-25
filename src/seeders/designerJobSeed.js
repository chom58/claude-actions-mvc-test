const { JobSite, DesignerJob } = require('../models');

const designerJobSeed = async () => {
  try {
    console.log('デザイナー求人シーダーを開始します...');

    const jobSitesData = [
      {
        name: 'vivivit',
        url: 'https://vivivit.jp',
        description: '映像・Webクリエイターのための求人サイト',
        category: 'creative',
        priority: 10
      },
      {
        name: 'デザイナーのお仕事',
        url: 'https://designer-oshigoto.com',
        description: 'デザイナー専門の求人情報サイト',
        category: 'design',
        priority: 9
      },
      {
        name: 'リデザイナー',
        url: 'https://redesigner.jp',
        description: 'Webデザイナー・UIデザイナー専門求人',
        category: 'design',
        priority: 8
      },
      {
        name: 'グラフィカルジョブ',
        url: 'https://graphical-job.com',
        description: 'グラフィックデザイナー向け求人サイト',
        category: 'design',
        priority: 7
      },
      {
        name: 'クリナビ',
        url: 'https://kurinavi.jp',
        description: 'クリエイティブ業界専門の転職サイト',
        category: 'creative',
        priority: 6
      },
      {
        name: 'マイナビクリエイター',
        url: 'https://mynavi-creator.jp',
        description: 'Web・ゲーム・IT業界に特化した転職支援サービス',
        category: 'creative',
        priority: 8
      },
      {
        name: 'リクナビNEXT',
        url: 'https://next.rikunabi.com',
        description: '日本最大級の転職サイト',
        category: 'general',
        priority: 5
      },
      {
        name: 'Wantedly',
        url: 'https://wantedly.com',
        description: 'シゴトでココロオドルを、すべての人に',
        category: 'general',
        priority: 7
      },
      {
        name: 'レバテッククリエイター',
        url: 'https://creator.levtech.jp',
        description: 'Web・ゲーム業界のクリエイター専門エージェント',
        category: 'creative',
        priority: 8
      },
      {
        name: 'GREEN',
        url: 'https://green-japan.com',
        description: 'IT/Web業界の転職サイト',
        category: 'creative',
        priority: 6
      }
    ];

    const jobSites = [];
    for (const siteData of jobSitesData) {
      const [site, created] = await JobSite.findOrCreate({
        where: { name: siteData.name },
        defaults: siteData
      });
      jobSites.push(site);
      if (created) {
        console.log(`✓ 求人サイト「${site.name}」を作成しました`);
      }
    }

    const designerJobsData = [
      {
        title: 'UIデザイナー（未経験歓迎）',
        company: 'スタートアップテック株式会社',
        description: 'モバイルアプリのUIデザインを担当していただきます。Figmaを使った経験があれば歓迎しますが、未経験の方にも丁寧に指導いたします。',
        location: '東京都渋谷区',
        salary: '年収300万円〜450万円',
        employment_type: 'full_time',
        experience_level: 'entry',
        is_entry_level_ok: true,
        is_new_grad_ok: true,
        skills_required: ['Photoshop', 'Illustrator'],
        skills_preferred: ['Figma', 'Sketch', 'Adobe XD'],
        original_url: 'https://example.com/job1',
        jobSiteId: 1,
        posted_date: new Date('2024-01-15'),
        deadline: new Date('2024-03-15'),
        is_featured: true,
        is_approved: true,
        tags: ['未経験歓迎', 'スタートアップ', 'モバイル']
      },
      {
        title: 'グラフィックデザイナー（新卒採用）',
        company: '広告クリエイティブ株式会社',
        description: '広告制作会社でのグラフィックデザイン業務です。ポスター、チラシ、Webバナーなど幅広い制作物を手がけます。',
        location: '東京都新宿区',
        salary: '年収280万円〜350万円',
        employment_type: 'full_time',
        experience_level: 'entry',
        is_entry_level_ok: true,
        is_new_grad_ok: true,
        skills_required: ['Photoshop', 'Illustrator', 'InDesign'],
        skills_preferred: ['After Effects', 'Premiere Pro'],
        original_url: 'https://example.com/job2',
        jobSiteId: 2,
        posted_date: new Date('2024-01-20'),
        deadline: new Date('2024-04-20'),
        is_featured: false,
        is_approved: true,
        tags: ['新卒歓迎', '広告', 'グラフィック']
      },
      {
        title: 'Webデザイナー（実務未経験OK）',
        company: 'デジタルエージェンシー合同会社',
        description: 'コーポレートサイトやECサイトのデザインを担当。HTML/CSSの知識があれば尚良いですが、デザインに集中していただけます。',
        location: '大阪府大阪市',
        salary: '年収320万円〜480万円',
        employment_type: 'full_time',
        experience_level: 'entry',
        is_entry_level_ok: true,
        is_new_grad_ok: false,
        skills_required: ['Photoshop', 'Illustrator'],
        skills_preferred: ['HTML', 'CSS', 'JavaScript', 'WordPress'],
        original_url: 'https://example.com/job3',
        jobSiteId: 3,
        posted_date: new Date('2024-01-25'),
        deadline: new Date('2024-03-25'),
        is_featured: true,
        is_approved: true,
        tags: ['未経験可', 'Web制作', '関西']
      },
      {
        title: 'プロダクトデザイナー（ジュニア歓迎）',
        company: 'テックベンチャー株式会社',
        description: 'SaaSプロダクトのUXデザインを担当。ユーザー調査から実装まで幅広く経験できます。',
        location: '東京都品川区',
        salary: '年収380万円〜520万円',
        employment_type: 'full_time',
        experience_level: 'junior',
        is_entry_level_ok: true,
        is_new_grad_ok: true,
        skills_required: ['Figma', 'Sketch'],
        skills_preferred: ['Miro', 'Notion', 'HTML', 'CSS'],
        original_url: 'https://example.com/job4',
        jobSiteId: 4,
        posted_date: new Date('2024-02-01'),
        deadline: new Date('2024-04-01'),
        is_featured: false,
        is_approved: true,
        tags: ['ジュニア歓迎', 'SaaS', 'UXデザイン']
      },
      {
        title: 'ゲームUIデザイナー（未経験歓迎）',
        company: 'ゲーム開発株式会社',
        description: 'モバイルゲームのUIデザインを担当。ゲーム業界未経験でも、デザインへの情熱があれば歓迎します。',
        location: '東京都港区',
        salary: '年収350万円〜500万円',
        employment_type: 'full_time',
        experience_level: 'entry',
        is_entry_level_ok: true,
        is_new_grad_ok: true,
        skills_required: ['Photoshop', 'Illustrator'],
        skills_preferred: ['Unity', 'After Effects', 'Spine'],
        original_url: 'https://example.com/job5',
        jobSiteId: 5,
        posted_date: new Date('2024-02-05'),
        deadline: new Date('2024-04-05'),
        is_featured: true,
        is_approved: true,
        tags: ['未経験歓迎', 'ゲーム', 'モバイル']
      },
      {
        title: 'ブランドデザイナー（新卒・第二新卒歓迎）',
        company: 'ブランディング株式会社',
        description: '企業のブランディングデザインを手がけます。ロゴデザイン、パッケージデザイン、Webサイトまで総合的に担当。',
        location: '東京都中央区',
        salary: '年収300万円〜420万円',
        employment_type: 'full_time',
        experience_level: 'entry',
        is_entry_level_ok: true,
        is_new_grad_ok: true,
        skills_required: ['Illustrator', 'Photoshop', 'InDesign'],
        skills_preferred: ['After Effects', 'Cinema 4D'],
        original_url: 'https://example.com/job6',
        jobSiteId: 6,
        posted_date: new Date('2024-02-10'),
        deadline: new Date('2024-05-10'),
        is_featured: false,
        is_approved: true,
        tags: ['新卒歓迎', 'ブランディング', '第二新卒']
      },
      {
        title: 'デジタルマーケティングデザイナー（未経験可）',
        company: 'マーケティングエージェンシー株式会社',
        description: 'SNS広告、バナー広告、LPデザインを担当。マーケティング知識も身につけられる環境です。',
        location: '東京都世田谷区',
        salary: '年収280万円〜400万円',
        employment_type: 'full_time',
        experience_level: 'entry',
        is_entry_level_ok: true,
        is_new_grad_ok: false,
        skills_required: ['Photoshop', 'Illustrator'],
        skills_preferred: ['Adobe XD', 'Figma', 'Google Analytics'],
        original_url: 'https://example.com/job7',
        jobSiteId: 7,
        posted_date: new Date('2024-02-15'),
        deadline: new Date('2024-04-15'),
        is_featured: false,
        is_approved: true,
        tags: ['未経験可', 'マーケティング', '広告']
      },
      {
        title: 'EC サイトデザイナー（実務経験不問）',
        company: 'イーコマース株式会社',
        description: '自社ECサイトの改善、新商品ページの制作を担当。売上に直結するデザインが学べます。',
        location: 'リモートワーク可',
        salary: '年収320万円〜450万円',
        employment_type: 'full_time',
        experience_level: 'entry',
        is_entry_level_ok: true,
        is_new_grad_ok: true,
        skills_required: ['Photoshop', 'HTML', 'CSS'],
        skills_preferred: ['JavaScript', 'Shopify', 'GA4'],
        original_url: 'https://example.com/job8',
        jobSiteId: 8,
        posted_date: new Date('2024-02-20'),
        deadline: new Date('2024-05-20'),
        is_featured: true,
        is_approved: true,
        tags: ['実務経験不問', 'EC', 'リモート可']
      }
    ];

    for (const jobData of designerJobsData) {
      const [job, created] = await DesignerJob.findOrCreate({
        where: { 
          title: jobData.title, 
          company: jobData.company 
        },
        defaults: jobData
      });
      if (created) {
        console.log(`✓ 求人「${job.title}」を作成しました`);
      }
    }

    console.log('✓ デザイナー求人シーダーが正常に完了しました');
  } catch (error) {
    console.error('デザイナー求人シーダーエラー:', error);
    throw error;
  }
};

module.exports = designerJobSeed;