const router = require('express').Router();
const AuthController = require('../controller/AuthController');

router.post('/register', AuthController.register);

router.get('/verify/:id', AuthController.verify);

router.post('/login', AuthController.login);

router.post('/refreshtoken', AuthController.refreshToken);

router.delete('/logout', AuthController.logout);

module.exports = router;
