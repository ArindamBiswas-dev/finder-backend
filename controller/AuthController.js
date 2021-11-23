const createError = require('http-errors');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const pool = require('../db.config');
const {
  signUpAuthSchema,
  logInAuthSchema,
} = require('../util/validationSchema');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../util/jwtHelper');
const client = require('../util/init_redis');
const {
  sendVerificationMail,
  getEmailFromJWT,
} = require('../util/mailVerification');

module.exports = {
  register: async (req, res, next) => {
    try {
      const result = await signUpAuthSchema.validateAsync(req.body);
      const { fullName, email, password } = result;

      const doesExist = await pool.query(
        `select * from users where email = $1 limit 1;`,
        [email]
      );

      if (doesExist.rows.length > 0)
        throw createError.Conflict('This email is already registered');

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const firstName = fullName.split(' ')[0];

      const defaultUserName = firstName + crypto.randomBytes(5).toString('hex');

      const response = await pool.query(
        `insert into users(full_name, username, email, password) values($1, $2, $3, $4) returning *;`,
        [fullName, defaultUserName, email, hashedPassword]
      );

      // send email verification mail to the user
      await sendVerificationMail(email, fullName);

      //   const accessToken = await signAccessToken(response.rows[0].id);
      //   const refreshToken = await signRefreshToken(response.rows[0].id, true);
      //   res.send({ accessToken, refreshToken });

      res.send('User Register Successfully');
    } catch (err) {
      if (err.isJoi) err.status = 422;
      next(err);
    }
  },
  verify: async (req, res, next) => {
    try {
      const token = req.params.id;
      const email = await getEmailFromJWT(token);

      // check database using email and mark as email verified
      const result = await pool.query(
        `update users set email_verified = $1 where email = $2;`,
        [true, email]
      );

      if (result.rowCount < 1) {
        next(createError.BadRequest('User does not exist'));
      }

      res.send('Email Verified');
    } catch (err) {
      console.log(err.message);
      next(createError.BadRequest('Invalid Link'));
    }
  },
  login: async (req, res, next) => {
    try {
      const result = await logInAuthSchema.validateAsync(req.body);
      const { email, password } = result;

      const response = await pool.query(
        `select * from users where email = $1 limit 1`,
        [email]
      );
      const user = response.rows[0];

      if (!user) throw createError.NotFound('User is not register');
      if (!user.email_verified)
        throw createError.NotAcceptable('Email is not verified');

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) throw createError.Unauthorized('Email/Password is wrong');

      const accessToken = await signAccessToken(user.id);
      const refreshToken = await signRefreshToken(user.id);

      // set the cookies to the client
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
      });
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
      });

      res.send({ user, accessToken, refreshToken });
    } catch (err) {
      if (err.isJoi) next(createError.BadRequest('Invalid credentials'));
      next(err);
    }
  },
  refreshToken: async (req, res, next) => {
    try {
      const { refreshToken } = req.cookies;
      if (!refreshToken) throw createError.BadRequest();
      const userId = await verifyRefreshToken(refreshToken);

      const newAccessToken = await signAccessToken(userId);
      const newRefreshToken = await signRefreshToken(userId);
      res.send({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
      next(err);
    }
  },
  logout: async (req, res, next) => {
    try {
      const { refreshToken } = req.cookies;
      const userId = await verifyRefreshToken(refreshToken);
      console.log(userId);

      client.del(userId, (err, value) => {
        if (err) {
          console.log(err.message);
          throw createError.InternalServerError();
        }
        console.log(value);
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        res.sendStatus(204);
      });
    } catch (err) {
      next(err);
    }
  },
};
