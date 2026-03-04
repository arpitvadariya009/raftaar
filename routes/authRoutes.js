const express = require('express');
const router = express.Router();
const { registerSchema, loginSchema } = require('../validations/authValidation');
const validate = require('../middlewares/validateRequest');
const {
    registerUser,
    loginUser,
} = require('../controllers/authController');

router.post('/registerUser', validate(registerSchema), registerUser);
router.post('/loginUser', validate(loginSchema), loginUser);

module.exports = router;
