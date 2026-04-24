const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');

// Helper to check for auth/admin (simplified for now, ideally use middleware)
// For now, assuming these routes are protected by server.js or frontend logic
// In a real app, adding auth middleware here is best.

router.post('/', classController.createClass);
router.get('/', classController.getAllClasses);
router.put('/:id', classController.updateClass);
router.delete('/:id', classController.deleteClass);
router.put('/:id/restore', classController.restoreClass);
router.get('/:id/students', classController.getClassStudents);

module.exports = router;
