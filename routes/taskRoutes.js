const express = require('express');
const router = express.Router();
const { createTask, getTasks, updateTaskStatus, getTaskStats } = require('../controllers/taskController');
// const { protect } = require('../middleware/authMiddleware'); // Assuming you have protect middleware

router.post('/', createTask);
router.get('/', getTasks);
router.get('/stats', getTaskStats);
router.put('/:id/status', updateTaskStatus);

module.exports = router;
