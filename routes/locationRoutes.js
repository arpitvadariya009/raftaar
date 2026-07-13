const express = require('express');
const router = express.Router();
const {
    logLocation,
    getTimeline,
    getLiveLocations,
    getLocationLogs,
    getEmployeeStats,
    updateTrackingStatus
} = require('../controllers/locationController');

// ─── Existing Routes ──────────────────────────────────────────────────────────
router.post('/logLocation', logLocation);
router.get('/getTimeline', getTimeline);

// ─── NEW: HR Dashboard Routes ─────────────────────────────────────────────────
// Live locations of all employees in a company
router.get('/live', getLiveLocations);

// Full logs with filter (date, employee, pagination)
router.get('/logs', getLocationLogs);

// Single employee stats + today's timeline
router.get('/employee-stats', getEmployeeStats);

// Employee tracking start/pause/stop
router.patch('/tracking-status', updateTrackingStatus);

module.exports = router;
