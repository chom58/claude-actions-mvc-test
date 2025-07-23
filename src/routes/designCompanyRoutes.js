const express = require('express');
const router = express.Router();
const designCompanyController = require('../controllers/designCompanyController');
const harajukuValidation = require('../utils/harajukuValidation');

// デザイン会社一覧取得
router.get('/', 
  harajukuValidation.validateQuery,
  designCompanyController.getAllCompanies
);

// 原宿エリアのデザイン会社取得
router.get('/harajuku', 
  harajukuValidation.validateQuery,
  designCompanyController.getHarajukuCompanies
);

// 特定デザイン会社取得
router.get('/:id', 
  harajukuValidation.validateId,
  designCompanyController.getCompanyById
);

// デザイン会社登録
router.post('/', 
  harajukuValidation.createCompany,
  designCompanyController.createCompany
);

// デザイン会社更新
router.put('/:id', 
  harajukuValidation.updateCompany,
  designCompanyController.updateCompany
);

// デザイン会社削除
router.delete('/:id', 
  harajukuValidation.validateId,
  designCompanyController.deleteCompany
);

module.exports = router;