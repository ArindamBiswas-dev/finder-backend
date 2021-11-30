const createError = require('http-errors');
const pool = require('../db.config');

const LIMIT = 20;

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
        `select users.id, full_name, avatar, username, title, description, slug, last_edit from users inner join courses
        on users.id = courses.user_id order by last_edit desc limit $1 offset $2;`,
        [LIMIT, page * LIMIT]
      );

      res.json(result.rows);
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
  getAllJI: async (req, res, next) => {
    try {
      const page = getPageNumber(req);
      const result = await pool.query(
        `select users.id, full_name, avatar, username, title, description, slug, last_edit, start_date, end_date from users inner join ji
        on users.id = ji.user_id order by last_edit desc limit $1 offset $2;`,
        [LIMIT, page * LIMIT]
      );

      res.json(result.rows);
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

      // get the course
      const result = await pool.query(
        `select * from ji where slug = $1 limit 1;`,
        [page_slug]
      );
      if (result.rowCount === 0) {
        throw createError.NotFound();
      }
      const ji = result.rows[0];
      const jiUserId = ji.user_id;

      // get the courseUser
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
        `select * from courses where to_tsvector(title|| ' ' || description)
      @@ plainto_tsquery($1);`,
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
        `select * from ji where to_tsvector(title|| ' ' || description)
      @@ plainto_tsquery($1);`,
        [searchQuery]
      );
      res.send(result.rows);
    } catch (err) {
      console.log(err.message);
      next(err);
    }
  },
};
