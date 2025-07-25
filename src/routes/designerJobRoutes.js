const express = require('express');
const router = express.Router();
const designerJobController = require('../controllers/designerJobController');
const auth = require('../middleware/auth');

router.get('/', designerJobController.getAllJobs);

router.get('/stats/entry-level', designerJobController.getEntryLevelStats);

router.get('/featured/list', designerJobController.getFeaturedJobs);

router.get('/:id', designerJobController.getJobById);

router.post('/:id/click', designerJobController.trackClick);

router.post('/', auth, designerJobController.createJob);

router.put('/:id', auth, designerJobController.updateJob);

router.delete('/:id', auth, designerJobController.deleteJob);

router.patch('/:id/approve', auth, designerJobController.approveJob);

module.exports = router;