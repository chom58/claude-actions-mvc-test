const express = require('express');
const router = express.Router();
const jobSiteController = require('../controllers/jobSiteController');
const auth = require('../middleware/auth');

router.get('/', jobSiteController.getAllJobSites);

router.get('/:id', jobSiteController.getJobSiteById);

router.post('/', auth, jobSiteController.createJobSite);

router.put('/:id', auth, jobSiteController.updateJobSite);

router.delete('/:id', auth, jobSiteController.deleteJobSite);

router.patch('/:id/toggle-active', auth, jobSiteController.toggleActive);

module.exports = router;