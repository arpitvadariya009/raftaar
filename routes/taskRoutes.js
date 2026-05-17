const express = require('express');
const router = express.Router();
const { createTask, getTasks, updateTaskStatus, getTaskStats } = require('../controllers/taskController');
// const { protect } = require('../middleware/authMiddleware'); // Assuming you have protect middleware

router.post('/createTask', createTask);
router.get('/getTasks', getTasks);
router.get('/getTaskStats', getTaskStats);
router.put('/updateTaskStatus/:id', updateTaskStatus);

module.exports = router;
