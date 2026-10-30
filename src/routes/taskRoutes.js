// Routes only map METHOD + URL to a controller function.
const express = require('express');
const router = express.Router();
const c = require('../controllers/taskController');

router.get('/', c.getAllTasks);
router.post('/', c.createTask);
router.get('/:id', c.getTaskById);
router.put('/:id', c.updateTask);
router.patch('/:id', c.patchTask);
router.delete('/:id', c.deleteTask);

module.exports = router;