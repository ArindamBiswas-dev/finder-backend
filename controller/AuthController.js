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

      const avatar = `https://avatars.dicebear.com/api/bottts/${defaultUserName}.svg?background=white`;

      const response = await pool.query(
        `insert into users(full_name, username, email, password, avatar) values($1, $2, $3, $4, $5) returning *;`,
        [fullName, defaultUserName, email, hashedPassword, avatar]
      );

      // send email verification mail to the user
      const resposnMailPromise = await sendVerificationMail(email, fullName);
      console.log(resposnMailPromise);

      //   const accessToken = await signAccessToken(response.rows[0].id);
      //   const refreshToken = await signRefreshToken(response.rows[0].id, true);
      //   res.send({ accessToken, refreshToken });

      res.send('User Register Successfully');
    } catch (err) {
      if (err.isJoi) err.status = 422;
      console.log(err.message);
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

      console.log('attaching the cookie');

      // set the cookies to the client
      // res.cookie('accessToken', accessToken, {
      //   httpOnly: true,
      // });
      // res.cookie('refreshToken', refreshToken, {
      //   httpOnly: true,
      // });
      // res.cookie('hello', 'hello_cookie', {
      //   httpOnly: false,
      // });

      // res.send({ user, accessToken, refreshToken });
      return res
        .status(202)
        .cookie('accessToken', accessToken, {
          httpOnly: true,
        })
        .cookie('refreshToken', refreshToken, {
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24 * 30,
        })
        .send({ token: accessToken, user });
    } catch (err) {
      console.log(err.message);
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
      res.send({
        userId,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      next(err);
    }
  },
  getNewAccessToken: async (req, res, next) => {
    try {
      const { refreshToken } = req.cookies;
      console.log(req.cookies);
      if (!refreshToken) throw createError.BadRequest();
      const userId = await verifyRefreshToken(refreshToken);

      const newAccessToken = await signAccessToken(userId);

      // fetch the username also
      const users = await pool.query(`select * from users where id = $1`, [
        userId,
      ]);
      const user = users.rows[0];
      console.log(user);

      // set the cookies to the client
      res.cookie('accessToken', newAccessToken, {
        httpOnly: true,
      });
      res.send({
        user,
        accessToken: newAccessToken,
      });
    } catch (err) {
      console.log(err.message);
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
