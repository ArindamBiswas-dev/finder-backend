const router = require('express').Router();
const ApiController = require('../controller/ApiController');

router.get('/getallcourse', ApiController.getAllCourses);
router.get('/getallji', ApiController.getAllJI);
router.get('/getsinglecourse/:id', ApiController.getSingleCourse);
router.get('/getsingleji/:id', ApiController.getSingleJI);
router.get('/searchcourse', ApiController.searchCourse);
router.get('/searchji', ApiController.searchJI);

module.exports = router;
