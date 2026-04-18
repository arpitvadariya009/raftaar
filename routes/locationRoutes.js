const express = require('express');
const router = express.Router();
const { logLocation, getTimeline } = require('../controllers/locationController');

router.post('/log', logLocation);
router.get('/timeline', getTimeline);

module.exports = router;
