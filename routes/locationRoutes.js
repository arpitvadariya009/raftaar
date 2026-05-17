const express = require('express');
const router = express.Router();
const { logLocation, getTimeline } = require('../controllers/locationController');

router.post('/logLocation', logLocation);
router.get('/getTimeline', getTimeline);

module.exports = router;
