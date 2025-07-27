module.exports = {
  User: [
    {
      username: 'admin_test',
      email: 'admin@test.com',
      password: 'Admin123!@#',
      role: 'admin',
      isActive: true
    },
    {
      username: 'user_test',
      email: 'user@test.com',
      password: 'User123!@#',
      role: 'user',
      isActive: true
    },
    {
      username: 'inactive_test',
      email: 'inactive@test.com',
      password: 'Inactive123!@#',
      role: 'user',
      isActive: false
    }
  ],
  
  DesignCompany: [
    {
      name: '原宿デザインスタジオ',
      description: 'クリエイティブなデザインソリューションを提供',
      location: '原宿',
      website: 'https://harajuku-design.example.com',
      employeeCount: 15,
      tags: ['UI/UX', 'ブランディング', 'Web開発']
    },
    {
      name: '渋谷クリエイティブラボ',
      description: '最先端のデジタルデザイン',
      location: '渋谷',
      website: 'https://shibuya-creative.example.com',
      employeeCount: 25,
      tags: ['モバイルアプリ', '3Dデザイン', 'AR/VR']
    }
  ],
  
  ApparelBrand: [
    {
      name: 'HARAJUKU STREET',
      description: '原宿発のストリートウェアブランド',
      category: 'streetwear',
      priceRange: 'mid',
      tags: ['ストリート', 'カジュアル', 'ユニセックス']
    },
    {
      name: 'Tokyo Minimal',
      description: 'ミニマルで洗練されたデザイン',
      category: 'designer',
      priceRange: 'high',
      tags: ['ミニマル', 'ハイエンド', 'サステナブル']
    }
  ],
  
  CreativeEvent: [
    {
      title: '原宿デザインウィーク2024',
      description: 'デザイナーとブランドが集まる一週間',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-10-07'),
      location: '原宿',
      capacity: 500,
      price: 3000,
      status: 'upcoming'
    },
    {
      title: 'ファッション×テクノロジー展',
      description: '最新技術とファッションの融合',
      startDate: new Date('2024-11-15'),
      endDate: new Date('2024-11-17'),
      location: '渋谷',
      capacity: 300,
      price: 2500,
      status: 'upcoming'
    }
  ],
  
  DesignerJob: [
    {
      title: 'UI/UXデザイナー募集',
      company: 'テックスタートアップA社',
      description: 'モバイルアプリのUI/UXデザインを担当',
      location: '東京',
      employmentType: 'full_time',
      experienceLevel: 'mid_level',
      salary: '500-700万円',
      skills: ['Figma', 'Adobe XD', 'プロトタイピング'],
      isRemote: true,
      status: 'active'
    },
    {
      title: 'グラフィックデザイナー（新卒歓迎）',
      company: 'クリエイティブエージェンシーB社',
      description: 'ブランディングとビジュアルデザイン',
      location: '渋谷',
      employmentType: 'full_time',
      experienceLevel: 'entry_level',
      salary: '300-400万円',
      skills: ['Photoshop', 'Illustrator', 'InDesign'],
      isRemote: false,
      status: 'active'
    }
  ]
};