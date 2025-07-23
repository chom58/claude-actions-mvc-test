const { 
  DesignCompany, 
  ApparelBrand, 
  CreativeEvent, 
  Collaboration, 
  MatchingRequest 
} = require('../models');

const seedCreativeCommunity = async () => {
  try {
    console.log('🌱 原宿クリエイティブコミュニティのサンプルデータを生成中...');

    // デザイン会社のサンプルデータ
    const designCompanies = await DesignCompany.bulkCreate([
      {
        name: 'HARAJUKU DESIGN STUDIO',
        description: '原宿の最前線で活動するクリエイティブスタジオ。ブランディングからデジタル体験まで幅広く手がける。',
        specialties: ['ブランディング', 'グラフィックデザイン', 'UI/UXデザイン'],
        location: '原宿',
        establishedYear: 2018,
        employeeCount: '6-20',
        portfolioUrl: 'https://harajuku-design.example.com/portfolio',
        websiteUrl: 'https://harajuku-design.example.com',
        contactEmail: 'info@harajuku-design.example.com',
        contactPhone: '03-1234-5678',
        philosophy: '原宿カルチャーとデザインの融合で、世界に新しい価値を発信します。',
        collaborationAreas: ['ファッション', 'アート', '音楽'],
        providedSkills: ['ロゴデザイン', 'Webサイト制作', 'ブランド戦略'],
        isVerified: true,
        rating: 4.8,
        totalProjects: 156
      },
      {
        name: 'NEON CREATIVE COLLECTIVE',
        description: 'デジタルとフィジカルを繋ぐ体験デザインに特化したクリエイティブコレクティブ。',
        specialties: ['UI/UXデザイン', 'インタラクションデザイン', 'AR/VR'],
        location: '原宿',
        establishedYear: 2020,
        employeeCount: '1-5',
        portfolioUrl: 'https://neon-creative.example.com/work',
        websiteUrl: 'https://neon-creative.example.com',
        contactEmail: 'hello@neon-creative.example.com',
        philosophy: 'テクノロジーとクリエイティビティで未来の体験をデザインします。',
        collaborationAreas: ['テクノロジー', 'ファッション', 'エンターテイメント'],
        providedSkills: ['アプリデザイン', 'プロトタイピング', 'ユーザーリサーチ'],
        isVerified: true,
        rating: 4.6,
        totalProjects: 87
      },
      {
        name: 'KAWAII GRAPHICS LAB',
        description: 'かわいいを科学するグラフィックデザインラボ。原宿らしいポップなデザインが得意。',
        specialties: ['グラフィックデザイン', 'イラストレーション', 'パッケージデザイン'],
        location: '原宿',
        establishedYear: 2015,
        employeeCount: '6-20',
        portfolioUrl: 'https://kawaii-graphics.example.com/gallery',
        websiteUrl: 'https://kawaii-graphics.example.com',
        contactEmail: 'contact@kawaii-graphics.example.com',
        contactPhone: '03-2345-6789',
        philosophy: 'かわいいデザインで世界を笑顔にします。',
        collaborationAreas: ['ファッション', 'コスメ', 'フード'],
        providedSkills: ['キャラクターデザイン', 'パッケージング', 'イベントビジュアル'],
        isVerified: true,
        rating: 4.9,
        totalProjects: 203
      }
    ]);

    // アパレルブランドのサンプルデータ
    const apparelBrands = await ApparelBrand.bulkCreate([
      {
        name: 'HARAJUKU REBELS',
        brandConcept: '反骨精神を持つ原宿ファッションの新世代。ストリートとハイファッションの境界を打ち破る。',
        targetMarket: ['ユニセックス', 'メンズ', 'レディース'],
        style: ['ストリート', 'アバンギャルド', 'パンク'],
        location: '原宿',
        establishedYear: 2019,
        teamSize: '6-20',
        lookbookUrl: 'https://harajuku-rebels.example.com/lookbook',
        websiteUrl: 'https://harajuku-rebels.example.com',
        instagramUrl: 'https://instagram.com/harajuku_rebels',
        contactEmail: 'brand@harajuku-rebels.example.com',
        contactPhone: '03-3456-7890',
        priceRange: 'ミドルレンジ',
        collaborationNeeds: ['グラフィックデザイン', 'Webサイト制作', 'イベント企画'],
        brandValues: ['多様性', 'サステナブル', '創造性'],
        isVerified: true,
        rating: 4.7,
        totalCollaborations: 34,
        seasonalCollections: 4
      },
      {
        name: 'CYBER KAWAII',
        brandConcept: 'サイバーパンクとかわいい文化の融合。デジタル時代の新しいかわいさを提案。',
        targetMarket: ['レディース', 'ユニセックス'],
        style: ['サイバーパンク', 'かわいい', 'フューチャリスティック'],
        location: '原宿',
        establishedYear: 2021,
        teamSize: '1-5',
        lookbookUrl: 'https://cyber-kawaii.example.com/collection',
        websiteUrl: 'https://cyber-kawaii.example.com',
        instagramUrl: 'https://instagram.com/cyber_kawaii_official',
        contactEmail: 'info@cyber-kawaii.example.com',
        priceRange: 'ハイエンド',
        collaborationNeeds: ['UI/UXデザイン', 'AR/VR体験', 'テクノロジー統合'],
        brandValues: ['イノベーション', 'テクノロジー', 'アート'],
        isVerified: true,
        rating: 4.5,
        totalCollaborations: 18,
        seasonalCollections: 2
      },
      {
        name: 'RETRO FUTURE TOKYO',
        brandConcept: '80年代の未来観と現代のトレンドを融合したレトロフューチャーブランド。',
        targetMarket: ['メンズ', 'レディース', 'ユニセックス'],
        style: ['レトロ', 'フューチャー', 'ネオン'],
        location: '原宿',
        establishedYear: 2017,
        teamSize: '21-50',
        lookbookUrl: 'https://retro-future-tokyo.example.com/archive',
        websiteUrl: 'https://retro-future-tokyo.example.com',
        instagramUrl: 'https://instagram.com/retrofuturetokyo',
        contactEmail: 'collaboration@retro-future-tokyo.example.com',
        contactPhone: '03-4567-8901',
        priceRange: 'ミドルレンジ',
        collaborationNeeds: ['ブランディング', 'イベント企画', 'インスタレーション'],
        brandValues: ['ノスタルジア', '未来志向', 'オリジナリティ'],
        isVerified: true,
        rating: 4.8,
        totalCollaborations: 67,
        seasonalCollections: 6
      }
    ]);

    // クリエイティブイベントのサンプルデータ
    const events = await CreativeEvent.bulkCreate([
      {
        title: '原宿クリエイティブネットワーキング2024春',
        description: 'デザイナーとファッションクリエイターが集まる春の大交流会。新しいコラボレーションの可能性を探ります。',
        eventType: 'ネットワーキング',
        targetAudience: ['デザイナー', 'ブランド関係者', 'クリエイター'],
        venue: '原宿イベントスペース',
        address: '東京都渋谷区神宮前1-1-1',
        eventDate: new Date('2024-04-15T19:00:00'),
        startTime: '19:00',
        endTime: '22:00',
        capacity: 120,
        currentParticipants: 45,
        registrationFee: 3000,
        isOnline: false,
        organizerType: 'community',
        organizerName: '原宿クリエイティブコミュニティ',
        contactEmail: 'events@harajuku-creative.example.com',
        tags: ['ネットワーキング', 'デザイン', 'ファッション', '原宿'],
        requirements: 'クリエイティブ業界での活動経験',
        agenda: '19:00-19:30 受付・ウェルカムドリンク\n19:30-20:30 基調講演\n20:30-22:00 フリーネットワーキング',
        speakers: [
          { name: '田中美咲', role: 'クリエイティブディレクター', company: 'HARAJUKU DESIGN STUDIO' },
          { name: '山田太郎', role: 'ブランドディレクター', company: 'HARAJUKU REBELS' }
        ],
        status: 'upcoming'
      },
      {
        title: 'デザイン×ファッション コラボワークショップ',
        description: 'デザイナーとアパレルブランドが協働でブランドアイデンティティを作り上げる実践ワークショップ。',
        eventType: 'ワークショップ',
        targetAudience: ['デザイナー', 'ブランド関係者'],
        venue: '原宿クリエイティブラボ',
        address: '東京都渋谷区神宮前2-2-2',
        eventDate: new Date('2024-04-22T14:00:00'),
        startTime: '14:00',
        endTime: '18:00',
        capacity: 30,
        currentParticipants: 18,
        registrationFee: 8000,
        isOnline: false,
        organizerType: 'design_company',
        organizerId: 1,
        organizerName: 'HARAJUKU DESIGN STUDIO',
        contactEmail: 'workshop@harajuku-design.example.com',
        tags: ['ワークショップ', 'ブランディング', '実践', 'コラボレーション'],
        requirements: 'Photoshop, Illustratorの基本操作ができること',
        agenda: '14:00-15:30 ブランド分析\n15:45-17:15 デザイン制作\n17:15-18:00 発表・フィードバック',
        speakers: [
          { name: '佐藤花子', role: 'シニアデザイナー', company: 'HARAJUKU DESIGN STUDIO' }
        ],
        status: 'upcoming'
      }
    ]);

    // コラボレーションのサンプルデータ
    const collaborations = await Collaboration.bulkCreate([
      {
        title: 'HARAJUKU REBELS ブランドリニューアルプロジェクト',
        description: 'ストリートファッションブランドの全面的なブランドリニューアル。ロゴから店舗デザインまで一括で手がけた大型プロジェクト。',
        projectType: 'ブランディング',
        designCompanyId: 1,
        apparelBrandId: 1,
        status: 'completed',
        startDate: new Date('2023-08-01'),
        expectedEndDate: new Date('2023-11-30'),
        actualEndDate: new Date('2023-11-15'),
        budget: 2500000,
        deliverables: ['新ロゴデザイン', 'ブランドガイドライン', '店舗デザイン', 'Webサイト', 'パッケージデザイン'],
        skills: ['ブランド戦略', 'グラフィックデザイン', '空間デザイン'],
        objectives: 'ブランドの認知度向上と売上の20%向上',
        results: 'リニューアル後3ヶ月で売上35%向上。SNSフォロワー数2倍増。',
        testimonial: '期待以上の結果でした。デザインの力でブランドが生まれ変わりました。',
        rating: 4.9,
        imageUrls: ['https://example.com/project1-1.jpg', 'https://example.com/project1-2.jpg'],
        portfolioUrl: 'https://harajuku-design.example.com/case-study/rebels-renewal',
        tags: ['ブランディング', 'リニューアル', 'ストリート', '成功事例'],
        isFeatured: true,
        isPublic: true,
        lessons: 'ブランドの核となる価値観を明確にすることの重要性を再確認',
        challenges: '既存ファンを失わずに新しい層にアピールするバランス'
      },
      {
        title: 'CYBER KAWAII デジタル体験デザイン',
        description: 'AR技術を活用したバーチャル試着体験とECサイトの統合プロジェクト。未来的なショッピング体験を実現。',
        projectType: 'Webサイト制作',
        designCompanyId: 2,
        apparelBrandId: 2,
        status: 'completed',
        startDate: new Date('2024-01-15'),
        expectedEndDate: new Date('2024-03-31'),
        actualEndDate: new Date('2024-03-28'),
        budget: 1800000,
        deliverables: ['AR試着アプリ', 'ECサイト', 'ブランドサイト', '管理システム'],
        skills: ['UI/UXデザイン', 'AR開発', 'Webデザイン'],
        objectives: 'オンライン売上の向上とブランド体験の革新',
        results: 'AR試着機能により返品率40%削減。オンライン売上150%向上。',
        testimonial: 'テクノロジーとデザインの完璧な融合。お客様の反応が素晴らしいです。',
        rating: 4.8,
        imageUrls: ['https://example.com/project2-1.jpg', 'https://example.com/project2-2.jpg'],
        portfolioUrl: 'https://neon-creative.example.com/work/cyber-kawaii-ar',
        tags: ['AR', 'デジタル体験', 'イノベーション', 'EC'],
        isFeatured: true,
        isPublic: true,
        lessons: 'テクノロジーとファッションの融合には深い理解が必要',
        challenges: 'AR技術の精度向上とユーザビリティの両立'
      }
    ]);

    // マッチングリクエストのサンプルデータ
    const matchingRequests = await MatchingRequest.bulkCreate([
      {
        title: 'サステナブルファッションブランドのWebサイト制作パートナー募集',
        description: 'エシカルファッションに特化した新ブランドのWebサイト制作を担当していただけるデザイン会社を探しています。',
        requestType: 'seeking_designer',
        requesterType: 'apparel_brand',
        requesterId: 1,
        requesterName: 'ECO FASHION TOKYO',
        targetType: 'design_company',
        skillsNeeded: ['Webデザイン', 'UI/UX', 'ブランディング'],
        skillsOffered: ['ファッション知識', 'サステナビリティ知識', 'マーケティング'],
        projectScope: 'long_term',
        budgetRange: '50-100万円',
        timeline: '3-4ヶ月',
        requirements: 'サステナブルファッションへの理解があること',
        contactEmail: 'partnership@eco-fashion-tokyo.example.com',
        contactMethod: ['email', 'meeting'],
        location: '原宿',
        isRemoteOk: true,
        experienceLevel: 'mid_level',
        tags: ['サステナブル', 'エシカル', 'Webサイト', '新ブランド'],
        priority: 'high',
        status: 'active',
        expiryDate: new Date('2024-05-31')
      },
      {
        title: 'ポップアップストア企画・デザインコラボレーション',
        description: '夏の期間限定ポップアップストアの企画から店舗デザインまでお任せできるパートナーを募集中。',
        requestType: 'collaboration_offer',
        requesterType: 'apparel_brand',
        requesterId: 3,
        requesterName: 'RETRO FUTURE TOKYO',
        targetType: 'design_company',
        skillsNeeded: ['空間デザイン', 'イベント企画', 'グラフィックデザイン'],
        skillsOffered: ['ブランド知識', 'マーケティング', '予算管理'],
        projectScope: 'short_term',
        budgetRange: '100-500万円',
        timeline: '2ヶ月',
        requirements: '商業空間デザインの経験必須',
        contactEmail: 'popup@retro-future-tokyo.example.com',
        contactMethod: ['email', 'phone', 'meeting'],
        location: '原宿',
        isRemoteOk: false,
        experienceLevel: 'senior',
        tags: ['ポップアップ', '空間デザイン', '期間限定', '夏企画'],
        priority: 'urgent',
        status: 'active',
        expiryDate: new Date('2024-04-30')
      }
    ]);

    console.log('✅ サンプルデータの生成が完了しました！');
    console.log(`📊 生成されたデータ:`);
    console.log(`   - デザイン会社: ${designCompanies.length}社`);
    console.log(`   - アパレルブランド: ${apparelBrands.length}ブランド`);
    console.log(`   - イベント: ${events.length}件`);
    console.log(`   - コラボレーション: ${collaborations.length}件`);
    console.log(`   - マッチングリクエスト: ${matchingRequests.length}件`);

    return {
      designCompanies,
      apparelBrands,
      events,
      collaborations,
      matchingRequests
    };

  } catch (error) {
    console.error('❌ サンプルデータ生成エラー:', error);
    throw error;
  }
};

module.exports = { seedCreativeCommunity };