const express = require('express');
const router = express.Router();
const designCompanyController = require('../controllers/designCompanyController');
const designCompanyValidation = require('../utils/designCompanyValidation');

// 全てのデザイン会社を取得
router.get('/', designCompanyController.getAllCompanies);

// 原宿エリアのデザイン会社のみ取得
router.get('/harajuku', designCompanyController.getHarajukuCompanies);

// 統計情報を取得
router.get('/statistics', designCompanyController.getStatistics);

// 特定のデザイン会社を取得
router.get('/:id', designCompanyController.getCompanyById);

// 新しいデザイン会社を登録
router.post('/', designCompanyValidation.create, designCompanyController.createCompany);

// デザイン会社情報を更新
router.put('/:id', designCompanyValidation.update, designCompanyController.updateCompany);

// デザイン会社を削除
router.delete('/:id', designCompanyController.deleteCompany);

module.exports = router;