/**
 * E2Eテスト用のテストデータ
 */

const { faker } = require('@faker-js/faker');

/**
 * 有効なテストユーザーデータ
 */
const validUsers = {
  designer: {
    username: 'testdesigner',
    email: 'designer@test.com',
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
    profileType: 'designer',
    skills: 'UI/UX Design, Graphic Design, Figma',
    experience: 'intermediate',
    portfolioUrl: 'https://portfolio.example.com'
  },
  
  company: {
    username: 'testcompany',
    email: 'company@test.com',
    password: 'CompanyPass456!',
    confirmPassword: 'CompanyPass456!',
    profileType: 'company',
    skills: 'アパレル製造, ブランド運営',
    experience: 'expert',
    portfolioUrl: 'https://company.example.com'
  },

  brand: {
    username: 'testbrand',
    email: 'brand@test.com',
    password: 'BrandPass789!',
    confirmPassword: 'BrandPass789!',
    profileType: 'brand',
    skills: 'ブランドマネジメント, マーケティング',
    experience: 'advanced',
    portfolioUrl: 'https://brand.example.com'
  }
};

/**
 * 無効なテストデータ（バリデーションテスト用）
 */
const invalidUsers = {
  emptyFields: {
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  },
  
  invalidEmail: {
    username: 'testuser',
    email: 'invalid-email',
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!'
  },
  
  weakPassword: {
    username: 'testuser',
    email: 'test@example.com',
    password: '123',
    confirmPassword: '123'
  },
  
  passwordMismatch: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123!',
    confirmPassword: 'DifferentPassword456!'
  },
  
  duplicateEmail: {
    username: 'newuser',
    email: 'designer@test.com', // 既存のメールアドレス
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!'
  }
};

/**
 * 求人データ
 */
const jobData = {
  validJob: {
    title: 'UIデザイナー募集',
    company: 'テスト株式会社',
    description: 'モバイルアプリのUIデザインを担当していただきます。',
    requirements: 'Figma, Sketch使用経験3年以上',
    salary: '400万円〜600万円',
    location: '東京都渋谷区',
    employmentType: 'fulltime',
    category: 'ui-design'
  },
  
  searchFilters: {
    keywords: ['UI', 'デザイナー', 'Figma'],
    location: '東京',
    salaryRange: {
      min: 300,
      max: 800
    },
    employmentType: 'fulltime',
    category: 'design'
  }
};

/**
 * イベントデータ
 */
const eventData = {
  validEvent: {
    title: 'デザイナー交流会',
    description: '業界のデザイナーが集まる交流イベントです。',
    date: '2024-12-01',
    time: '19:00',
    location: '東京都渋谷区',
    maxParticipants: 50,
    category: 'networking'
  }
};

/**
 * コラボレーションデータ
 */
const collaborationData = {
  validCollaboration: {
    title: 'アパレルブランドロゴデザイン',
    description: '新しいアパレルブランドのロゴデザインを募集しています。',
    budget: '10万円〜20万円',
    deadline: '2024-11-30',
    skills: ['ロゴデザイン', 'ブランディング'],
    category: 'logo-design'
  }
};

/**
 * ランダムなテストユーザーを生成
 * @param {string} profileType - プロフィールタイプ
 * @returns {object} ランダムなユーザーデータ
 */
function generateRandomUser(profileType = 'designer') {
  const timestamp = Date.now();
  
  return {
    username: `testuser_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
    profileType,
    skills: faker.lorem.words(3),
    experience: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced', 'expert']),
    portfolioUrl: faker.internet.url()
  };
}

/**
 * ランダムな求人データを生成
 * @returns {object} ランダムな求人データ
 */
function generateRandomJob() {
  return {
    title: faker.person.jobTitle(),
    company: faker.company.name(),
    description: faker.lorem.paragraph(),
    requirements: faker.lorem.sentence(),
    salary: `${faker.number.int({ min: 300, max: 1000 })}万円`,
    location: faker.location.city(),
    employmentType: faker.helpers.arrayElement(['fulltime', 'parttime', 'contract', 'freelance']),
    category: faker.helpers.arrayElement(['ui-design', 'graphic-design', 'web-design', 'product-design'])
  };
}

/**
 * テスト用のファイルパス
 */
const testFiles = {
  images: {
    avatar: './tests/e2e/fixtures/files/test-avatar.jpg',
    portfolio: './tests/e2e/fixtures/files/test-portfolio.png',
    logo: './tests/e2e/fixtures/files/test-logo.svg'
  },
  documents: {
    resume: './tests/e2e/fixtures/files/test-resume.pdf'
  }
};

/**
 * テスト環境の設定
 */
const testConfig = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  timeout: {
    short: 5000,
    medium: 10000,
    long: 30000
  },
  retry: {
    count: 2,
    delay: 1000
  }
};

module.exports = {
  validUsers,
  invalidUsers,
  jobData,
  eventData,
  collaborationData,
  generateRandomUser,
  generateRandomJob,
  testFiles,
  testConfig
};