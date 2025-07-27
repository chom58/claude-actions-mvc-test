const { faker } = require('@faker-js/faker/locale/ja');

/**
 * テストデータ生成ユーティリティ
 */
class TestDataGenerator {
  /**
   * ランダムなユーザーデータを生成
   */
  static generateUser(overrides = {}) {
    return {
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: 'Test123!@#',
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: faker.helpers.arrayElement(['user', 'admin']),
      isActive: true,
      profileImage: faker.image.avatar(),
      bio: faker.lorem.paragraph(),
      ...overrides
    };
  }

  /**
   * ランダムな投稿データを生成
   */
  static generatePost(overrides = {}) {
    return {
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraphs(3),
      excerpt: faker.lorem.paragraph(),
      status: faker.helpers.arrayElement(['draft', 'published', 'archived']),
      tags: faker.helpers.arrayElements(['Tech', 'Design', 'Fashion', 'Art', 'Music'], 3),
      publishedAt: faker.date.recent(),
      viewCount: faker.number.int({ min: 0, max: 10000 }),
      ...overrides
    };
  }

  /**
   * ランダムなデザイン会社データを生成
   */
  static generateDesignCompany(overrides = {}) {
    return {
      name: faker.company.name() + ' デザイン',
      description: faker.company.catchPhrase(),
      location: faker.helpers.arrayElement(['原宿', '渋谷', '表参道', '青山']),
      website: faker.internet.url(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      employeeCount: faker.number.int({ min: 1, max: 100 }),
      foundedYear: faker.date.past({ years: 20 }).getFullYear(),
      specialties: faker.helpers.arrayElements([
        'UI/UXデザイン',
        'ブランディング',
        'グラフィックデザイン',
        'Webデザイン',
        'パッケージデザイン'
      ], 3),
      tags: faker.helpers.arrayElements(['モダン', 'ミニマル', 'クリエイティブ', 'イノベーティブ'], 2),
      ...overrides
    };
  }

  /**
   * ランダムなアパレルブランドデータを生成
   */
  static generateApparelBrand(overrides = {}) {
    return {
      name: faker.company.name(),
      description: faker.commerce.productDescription(),
      category: faker.helpers.arrayElement(['streetwear', 'high-fashion', 'casual', 'formal']),
      priceRange: faker.helpers.arrayElement(['low', 'mid', 'high', 'luxury']),
      targetAudience: faker.helpers.arrayElement(['男性', '女性', 'ユニセックス']),
      style: faker.helpers.arrayElements(['ストリート', 'ミニマル', 'アバンギャルド', 'クラシック'], 2),
      website: faker.internet.url(),
      instagram: '@' + faker.internet.userName(),
      tags: faker.helpers.arrayElements(['サステナブル', 'ハンドメイド', '日本製', 'オーガニック'], 2),
      ...overrides
    };
  }

  /**
   * ランダムな求人データを生成
   */
  static generateJob(overrides = {}) {
    return {
      title: faker.person.jobTitle() + ' デザイナー',
      company: faker.company.name(),
      description: faker.lorem.paragraphs(2),
      location: faker.helpers.arrayElement(['東京', 'リモート', '東京/リモート']),
      employmentType: faker.helpers.arrayElement(['full_time', 'part_time', 'contract', 'freelance']),
      experienceLevel: faker.helpers.arrayElement(['entry_level', 'mid_level', 'senior_level', 'executive']),
      salary: `${faker.number.int({ min: 300, max: 1000 })}万円〜${faker.number.int({ min: 400, max: 1500 })}万円`,
      skills: faker.helpers.arrayElements([
        'Photoshop', 'Illustrator', 'Figma', 'Sketch', 'XD',
        'HTML/CSS', 'JavaScript', 'React', 'UI/UX', 'Typography'
      ], 5),
      benefits: faker.helpers.arrayElements([
        'リモートワーク可',
        'フレックスタイム',
        '副業可',
        '研修制度充実',
        '交通費支給'
      ], 3),
      deadline: faker.date.future(),
      isRemote: faker.datatype.boolean(),
      isUrgent: faker.datatype.boolean(),
      ...overrides
    };
  }

  /**
   * ランダムなイベントデータを生成
   */
  static generateEvent(overrides = {}) {
    const startDate = faker.date.future();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + faker.number.int({ min: 1, max: 7 }));

    return {
      title: faker.lorem.words(3) + ' イベント',
      description: faker.lorem.paragraphs(2),
      startDate: startDate,
      endDate: endDate,
      location: faker.helpers.arrayElement(['原宿', '渋谷', '表参道', 'オンライン']),
      venue: faker.company.name() + ' ホール',
      capacity: faker.number.int({ min: 20, max: 500 }),
      price: faker.number.int({ min: 0, max: 10000 }),
      category: faker.helpers.arrayElement(['展示会', 'ワークショップ', 'セミナー', 'ネットワーキング']),
      organizer: faker.company.name(),
      speakers: Array(faker.number.int({ min: 1, max: 5 }))
        .fill(null)
        .map(() => faker.person.fullName()),
      tags: faker.helpers.arrayElements(['デザイン', 'ファッション', 'テクノロジー', 'アート'], 2),
      registrationUrl: faker.internet.url(),
      imageUrl: faker.image.url(),
      status: faker.helpers.arrayElement(['upcoming', 'ongoing', 'completed', 'cancelled']),
      ...overrides
    };
  }

  /**
   * 複数のデータを一括生成
   */
  static generateBulk(type, count, overrides = {}) {
    const generators = {
      user: this.generateUser,
      post: this.generatePost,
      designCompany: this.generateDesignCompany,
      apparelBrand: this.generateApparelBrand,
      job: this.generateJob,
      event: this.generateEvent
    };

    const generator = generators[type];
    if (!generator) {
      throw new Error(`Unknown data type: ${type}`);
    }

    return Array(count).fill(null).map((_, index) => 
      generator.call(this, { ...overrides, _index: index })
    );
  }

  /**
   * リレーショナルデータの生成
   */
  static generateRelationalData() {
    // ユーザーを生成
    const users = this.generateBulk('user', 10);
    
    // 各ユーザーに投稿を関連付け
    const posts = [];
    users.forEach(user => {
      const userPosts = this.generateBulk('post', faker.number.int({ min: 1, max: 5 }), {
        userId: user.id || faker.string.uuid(),
        author: user.username
      });
      posts.push(...userPosts);
    });

    // デザイン会社とブランドを生成
    const designCompanies = this.generateBulk('designCompany', 5);
    const apparelBrands = this.generateBulk('apparelBrand', 5);

    // イベントを生成（会社主催）
    const events = [];
    designCompanies.forEach(company => {
      const companyEvents = this.generateBulk('event', faker.number.int({ min: 0, max: 2 }), {
        organizerId: company.id || faker.string.uuid(),
        organizer: company.name
      });
      events.push(...companyEvents);
    });

    // 求人を生成（会社から）
    const jobs = [];
    [...designCompanies, ...apparelBrands].forEach(company => {
      const companyJobs = this.generateBulk('job', faker.number.int({ min: 0, max: 3 }), {
        companyId: company.id || faker.string.uuid(),
        company: company.name
      });
      jobs.push(...companyJobs);
    });

    return {
      users,
      posts,
      designCompanies,
      apparelBrands,
      events,
      jobs
    };
  }

  /**
   * 特定のシナリオ用データ生成
   */
  static generateScenarioData(scenario) {
    const scenarios = {
      // 新規ユーザー登録シナリオ
      newUserRegistration: () => ({
        validUser: this.generateUser(),
        invalidEmailUser: this.generateUser({ email: 'invalid-email' }),
        shortPasswordUser: this.generateUser({ password: '123' }),
        duplicateUser: this.generateUser({ email: 'existing@example.com' })
      }),

      // 投稿作成シナリオ
      postCreation: () => ({
        draftPost: this.generatePost({ status: 'draft' }),
        publishedPost: this.generatePost({ status: 'published' }),
        longPost: this.generatePost({ content: faker.lorem.paragraphs(10) }),
        shortPost: this.generatePost({ content: faker.lorem.sentence() })
      }),

      // 検索シナリオ
      search: () => ({
        searchableCompanies: this.generateBulk('designCompany', 20, {
          location: faker.helpers.arrayElement(['原宿', '渋谷', '表参道'])
        }),
        searchableJobs: this.generateBulk('job', 30, {
          skills: faker.helpers.arrayElements(['Figma', 'React', 'UI/UX'], 2)
        })
      }),

      // パフォーマンステスト用大量データ
      performance: () => ({
        manyUsers: this.generateBulk('user', 1000),
        manyPosts: this.generateBulk('post', 5000),
        manyJobs: this.generateBulk('job', 2000)
      })
    };

    const generator = scenarios[scenario];
    if (!generator) {
      throw new Error(`Unknown scenario: ${scenario}`);
    }

    return generator();
  }
}

module.exports = TestDataGenerator;