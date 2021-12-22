const router = require('express').Router();
const ApiController = require('../controller/ApiController');
const { verifyAccessToken } = require('../util/jwtHelper');

router.get('/getallcourse', ApiController.getAllCourses);
router.get('/getallji', ApiController.getAllJI);
router.get('/getsinglecourse/:id', ApiController.getSingleCourse);
router.get('/getsingleji/:id', ApiController.getSingleJI);
router.get('/searchcourse', ApiController.searchCourse);
router.get('/searchji', ApiController.searchJI);
router.get('/countallcourse', ApiController.countAllCourse);
router.get('/countallji', ApiController.countAllJI);
router.get(
  '/bookmarked/course',
  verifyAccessToken,
  ApiController.getBookmarkedCourse
);
router.get('/bookmarked/ji', verifyAccessToken, ApiController.getBookmarkedJI);
router.get('/user/:id', ApiController.getUser);
router.get(
  '/checkbookmarkedcourse/:id',
  verifyAccessToken,
  ApiController.checkBookmarkedCourse
);
router.get(
  '/checkbookmarkedji/:id',
  verifyAccessToken,
  ApiController.checkBookmarkedJI
);

// all post req
router.post('/addcourse', verifyAccessToken, ApiController.addCourse);
router.post('/addji', verifyAccessToken, ApiController.addJI);
router.post(
  '/addtobookmark/:id',
  verifyAccessToken,
  ApiController.addToBookmark
);
router.post(
  '/removefrombookmark/:id',
  verifyAccessToken,
  ApiController.removeFromBookmark
);
router.post('/updateprofile', verifyAccessToken, ApiController.updateProfile);

module.exports = router;
