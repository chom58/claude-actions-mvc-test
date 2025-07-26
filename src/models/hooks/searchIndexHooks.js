const searchIndexService = require('../../services/searchIndexService');
const logger = require('../../monitoring/logger');

/**
 * 検索インデックス自動更新フック
 * 
 * モデルの作成・更新・削除時に自動的に
 * 検索インデックスを更新
 */

/**
 * afterCreateフック
 */
function createIndexHook(type) {
  return async (instance, options) => {
    try {
      const data = instance.toJSON();
      await searchIndexService.indexDocument(type, instance.id, data);
      logger.debug(`Indexed ${type} document`, { id: instance.id });
    } catch (error) {
      logger.logError(error, { 
        hook: 'afterCreate', 
        type, 
        id: instance.id 
      });
    }
  };
}

/**
 * afterUpdateフック
 */
function updateIndexHook(type) {
  return async (instance, options) => {
    try {
      const data = instance.toJSON();
      await searchIndexService.indexDocument(type, instance.id, data);
      logger.debug(`Updated ${type} document index`, { id: instance.id });
    } catch (error) {
      logger.logError(error, { 
        hook: 'afterUpdate', 
        type, 
        id: instance.id 
      });
    }
  };
}

/**
 * afterDestroyフック
 */
function deleteIndexHook(type) {
  return async (instance, options) => {
    try {
      await searchIndexService.removeDocument(type, instance.id);
      logger.debug(`Removed ${type} document from index`, { id: instance.id });
    } catch (error) {
      logger.logError(error, { 
        hook: 'afterDestroy', 
        type, 
        id: instance.id 
      });
    }
  };
}

/**
 * モデルにフックを追加
 */
function addSearchIndexHooks(model, type) {
  model.addHook('afterCreate', createIndexHook(type));
  model.addHook('afterUpdate', updateIndexHook(type));
  model.addHook('afterDestroy', deleteIndexHook(type));
}

module.exports = {
  addSearchIndexHooks,
  createIndexHook,
  updateIndexHook,
  deleteIndexHook
};