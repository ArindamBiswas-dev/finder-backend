const createError = require('http-errors');
const pool = require('../db.config');
const { createUniqueSlug } = require('../util/createUniqueSlug');

const LIMIT = 1;

const getPageNumber = (req) => {
  const p = req.query.page || 0;
  if (p <= 0) return 0;
  return p - 1;
};

module.exports = {
  getAllCourses: async (req, res, next) => {
    try {
      const page = getPageNumber(req);
      const result = await pool.query(
        `select users.id as user_id, full_name, avatar, username, title, description, slug, last_edit, courses.id as course_id
        from users inner join courses
        on users.id = courses.user_id order by last_edit desc limit $1 offset $2;`,
        [LIMIT, page * LIMIT]
      );

      res.json({ rows: result.rows });
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  getAllJI: async (req, res, next) => {
    try {
      const page = getPageNumber(req);
      const result = await pool.query(
        `select users.id as user_id, ji.id as ji_id, full_name, avatar, username, title, description, slug, last_edit, start_date, end_date from users inner join ji
        on users.id = ji.user_id order by last_edit desc limit $1 offset $2;`,
        [LIMIT, page * LIMIT]
      );

      res.json({ rows: result.rows });
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  getSingleCourse: async (req, res, next) => {
    try {
      const page_slug = req.params.id;
      // console.log(page_slug);

      // get the course
      const result = await pool.query(
        `select * from courses where slug = $1 limit 1;`,
        [page_slug]
      );
      if (result.rowCount === 0) {
        throw createError.NotFound();
      }
      const course = result.rows[0];
      const courseUserId = course.user_id;

      // get the courseUser
      const userResult = await pool.query(
        `select username, avatar, full_name from users where id = $1 limit 1;`,
        [courseUserId]
      );
      const user = userResult.rows[0];
      res.send({ ...course, ...user });
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  getSingleJI: async (req, res, next) => {
    try {
      const page_slug = req.params.id;
      // console.log(page_slug);

      // get the ji
      const result = await pool.query(
        `select * from ji where slug = $1 limit 1;`,
        [page_slug]
      );
      if (result.rowCount === 0) {
        throw createError.NotFound();
      }
      const ji = result.rows[0];
      const jiUserId = ji.user_id;

      // get the jiUser
      const jiResult = await pool.query(
        `select username, avatar, full_name from users where id = $1 limit 1;`,
        [jiUserId]
      );
      const user = jiResult.rows[0];
      res.send({ ...ji, ...user });
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  searchCourse: async (req, res, next) => {
    try {
      const searchQuery = req.query.q;
      const result = await pool.query(
        `select full_name, username, avatar, title, slug, last_edit from users
        inner join (select * from courses where to_tsvector(title|| ' ' || description)
        @@ plainto_tsquery($1)) as scourses on users.id = scourses.user_id;`,
        [searchQuery]
      );
      res.send(result.rows);
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  searchJI: async (req, res, next) => {
    try {
      const searchQuery = req.query.q;
      const result = await pool.query(
        `select full_name, username, avatar, title, slug, last_edit, start_date, end_date from users
        inner join (select * from ji where to_tsvector(title|| ' ' || description)
        @@ plainto_tsquery($1)) as sji on users.id = sji.user_id;`,
        [searchQuery]
      );
      res.send(result.rows);
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  addCourse: async (req, res, next) => {
    try {
      const userId = req.payload;
      const { title, description, rating, link: courseLink } = req.body;
      const slug = createUniqueSlug(title);

      // add the course to database
      //* just ommit the courseLink for now
      await pool.query(
        `insert into courses(title, description, rating, slug, user_id, course_link) values ($1, $2, $3, $4, $5, $6)`,
        [title, description, rating, slug, userId, courseLink]
      );
      res.send('course added');
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  addJI: async (req, res, next) => {
    try {
      const userId = req.payload;
      const {
        title,
        description,
        startDate,
        endDate,
        link: jobLink,
      } = req.body;

      const slug = createUniqueSlug(title);

      // add the ji to database
      //* just ommit the jobLink for now
      await pool.query(
        `insert into ji(title, description, start_date, end_date, slug, user_id, ji_link) values ($1, $2, $3, $4, $5, $6, $7)`,
        [title, description, startDate, endDate, slug, userId, jobLink]
      );
      res.send('ji added');
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  countAllCourse: async (req, res, next) => {
    try {
      const totalRows = await pool.query(`select count(*) from courses`);
      res.send({ count: totalRows.rows[0].count });
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  countAllJI: async (req, res, next) => {
    try {
      const totalRows = await pool.query(`select count(*) from ji`);
      res.send({ count: totalRows.rows[0].count });
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  getBookmarkedCourse: async (req, res, next) => {
    try {
      const currUserId = req.payload;
      const response = await pool.query(
        `select * from course_bookmarks
        inner join 
        (select full_name, avatar, title, description, slug, courses.last_edit as course_last_edit, courses.id as course_id 
          from users inner join courses
          on users.id = courses.user_id 
          order by last_edit desc) as newJoin 
          on course_bookmarks.course_id = newJoin.course_id 
          where user_id = $1 
          order by last_edit desc;`,
        [currUserId]
      );
      res.send(response.rows);
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  getBookmarkedJI: async (req, res, next) => {
    try {
      const currUserId = req.payload;
      const response = await pool.query(
        `select * from ji_bookmarks
        inner join 
        (select full_name, avatar, title, description, slug, ji.last_edit as ji_last_edit, ji.id as ji_id,
          ji.start_date as start_date, ji.end_date as end_date
          from users inner join ji
          on users.id = ji.user_id 
          order by last_edit desc) as newJoin 
          on ji_bookmarks.ji_id = newJoin.ji_id 
          where user_id = $1
          order by last_edit desc;`,
        [currUserId]
      );
      res.send(response.rows);
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  getUser: async (req, res, next) => {
    try {
      const username = req.params.id;
      const response = await pool.query(
        `select * from users where username = $1`,
        [username]
      );
      res.send(response.rows[0]);
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  checkBookmarkedCourse: async (req, res, next) => {
    try {
      const courseId = req.params.id;
      const userId = req.payload;
      const response = await pool.query(
        `select * from course_bookmarks where course_id = $1 and user_id = $2;`,
        [courseId, userId]
      );
      console.log(response.rows);
      res.send(response.rows);
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  checkBookmarkedJI: async (req, res, next) => {
    try {
      const jiId = req.params.id;
      const userId = req.payload;
      const response = await pool.query(
        `select * from ji_bookmarks where ji_id = $1 and user_id = $2;`,
        [jiId, userId]
      );
      console.log(response.rows);
      res.send(response.rows);
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  addToBookmark: async (req, res, next) => {
    try {
      const topic = req.params.id;
      const userId = req.payload;
      const { itemId } = req.body;

      if (topic === 'course') {
        await pool.query(
          `insert into course_bookmarks (course_id, user_id) values($1, $2);`,
          [itemId, userId]
        );
        return res.send('Course added to bookmarks');
      }
      if (topic === 'ji') {
        await pool.query(
          `insert into ji_bookmarks (ji_id, user_id) values($1, $2);`,
          [itemId, userId]
        );
        return res.send('JI added to bookmarks');
      }
      next();
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  removeFromBookmark: async (req, res, next) => {
    try {
      const topic = req.params.id;
      const userId = req.payload;
      const { itemId } = req.body;

      if (topic === 'course') {
        await pool.query(
          `delete from course_bookmarks where course_id = $1 and user_id = $2;`,
          [itemId, userId]
        );
        return res.send('Course removed from bookmarks');
      }
      if (topic === 'ji') {
        await pool.query(
          `delete from ji_bookmarks where ji_id = $1 and user_id = $2;`,
          [itemId, userId]
        );
        return res.send('JI removed from bookmarks');
      }
      next();
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  updateProfile: async (req, res, next) => {
    try {
      const { name, username, bio } = req.body;
      const userId = req.payload;
      const response = await pool.query(
        `update users set full_name = $1, username = $2, bio = $3 where id = $4`,
        [name, username, bio, userId]
      );
      res.send('Profile updated');
    } catch (err) {
      if (
        err.message ===
        `duplicate key value violates unique constraint "users_username_key"`
      ) {
        err.message = 'Username is already taken';
      }
      console.log(err.message);
      next(err);
    }
  },
};
