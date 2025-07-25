const { 
  DesignerJob, 
  CreativeEvent, 
  Collaboration,
  DesignCompany,
  ApparelBrand
} = require('../models');
const searchIndexService = require('../services/searchIndexService');
const logger = require('../monitoring/logger');

/**
 * 検索インデックスを構築するタスク
 * 
 * 既存のデータベースから全データを取得して
 * 全文検索インデックスを作成
 */
async function buildSearchIndex() {
  try {
    logger.info('Starting search index build');
    
    // インデックスサービスを初期化
    await searchIndexService.initialize();

    // 1. デザイナー求人をインデックス
    logger.info('Indexing designer jobs...');
    const jobs = await DesignerJob.findAll();
    
    for (const job of jobs) {
      await searchIndexService.indexDocument('designer_job', job.id, {
        id: job.id,
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
        benefits: job.benefits,
        location: job.location,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        isRemoteOk: job.isRemoteOk,
        isExperienceWelcome: job.isExperienceWelcome,
        isNewGraduateWelcome: job.isNewGraduateWelcome,
        createdAt: job.createdAt
      });
    }
    logger.info(`Indexed ${jobs.length} designer jobs`);

    // 2. イベントをインデックス
    logger.info('Indexing events...');
    const events = await CreativeEvent.findAll();
    
    for (const event of events) {
      await searchIndexService.indexDocument('event', event.id, {
        id: event.id,
        name: event.name,
        description: event.description,
        location: event.location,
        date: event.date,
        createdAt: event.createdAt
      });
    }
    logger.info(`Indexed ${events.length} events`);

    // 3. コラボレーションをインデックス
    logger.info('Indexing collaborations...');
    const collaborations = await Collaboration.findAll();
    
    for (const collaboration of collaborations) {
      await searchIndexService.indexDocument('collaboration', collaboration.id, {
        id: collaboration.id,
        title: collaboration.title,
        description: collaboration.description,
        projectType: collaboration.projectType,
        budget: collaboration.budget,
        status: collaboration.status,
        createdAt: collaboration.createdAt
      });
    }
    logger.info(`Indexed ${collaborations.length} collaborations`);

    // 4. デザイン会社をインデックス
    logger.info('Indexing design companies...');
    const designCompanies = await DesignCompany.findAll();
    
    for (const company of designCompanies) {
      await searchIndexService.indexDocument('design_company', company.id, {
        id: company.id,
        name: company.name,
        description: company.description,
        specialties: company.specialties,
        location: company.location,
        createdAt: company.createdAt
      });
    }
    logger.info(`Indexed ${designCompanies.length} design companies`);

    // 5. アパレルブランドをインデックス
    logger.info('Indexing apparel brands...');
    const apparelBrands = await ApparelBrand.findAll();
    
    for (const brand of apparelBrands) {
      await searchIndexService.indexDocument('apparel_brand', brand.id, {
        id: brand.id,
        name: brand.name,
        description: brand.description,
        style: brand.style,
        location: brand.location,
        createdAt: brand.createdAt
      });
    }
    logger.info(`Indexed ${apparelBrands.length} apparel brands`);

    // インデックス統計を表示
    const stats = searchIndexService.getStats();
    logger.info('Search index build completed', stats);

    return stats;
  } catch (error) {
    logger.logError(error, { task: 'buildSearchIndex' });
    throw error;
  }
}

// CLIから直接実行された場合
if (require.main === module) {
  const sequelize = require('../config/database');
  
  sequelize.authenticate()
    .then(() => buildSearchIndex())
    .then(stats => {
      console.log('Search index build completed successfully');
      console.log('Stats:', stats);
      process.exit(0);
    })
    .catch(error => {
      console.error('Search index build failed:', error);
      process.exit(1);
    });
}

module.exports = buildSearchIndex;