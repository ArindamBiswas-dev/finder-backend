const jwt = require('jsonwebtoken');
const createError = require('http-errors');
const client = require('./init_redis');

module.exports = {
  signAccessToken: (userId) => {
    return new Promise((resolve, reject) => {
      const payload = {
        iss: 'finder',
        aud: userId,
      };
      const secret = process.env.JWT_ACCESSTOKEN_SECRET;
      const options = {
        expiresIn: '1h',
      };
      jwt.sign(payload, secret, options, (err, token) => {
        if (err) {
          console.log(err.message);
          return reject(createError.InternalServerError());
        }
        resolve(token);
      });
    });
  },
  verifyAccessToken: (req, res, next) => {
    // get the accesstoken from cookie
    const { accessToken } = req.cookies;
    console.log({ accessToken });

    if (!accessToken) {
      return next(createError.Unauthorized());
    }

    const secret = process.env.JWT_ACCESSTOKEN_SECRET;

    jwt.verify(accessToken, secret, (err, payload) => {
      if (err) {
        return next(createError.Unauthorized());
      }

      // add the userid as req.payload
      req.payload = payload.aud;
      console.log(payload.aud);
      next();
    });
  },
  signRefreshToken: (userId) => {
    return new Promise((resolve, reject) => {
      const payload = {
        iss: 'finder',
        aud: userId,
      };
      const secret = process.env.JWT_REFRESHTOKEN_SECRET;
      const options = {
        expiresIn: '1y',
      };
      jwt.sign(payload, secret, options, (err, token) => {
        if (err) {
          console.log(err.message);
          return reject(createError.InternalServerError());
        }
        client.set(userId, token, 'EX', 365 * 24 * 60 * 60, (err, reply) => {
          if (err) {
            return reject(createError.InternalServerError());
          }
          resolve(token);
        });
      });
    });
  },
  verifyRefreshToken: (refreshToken) => {
    return new Promise((resolve, reject) => {
      const secret = process.env.JWT_REFRESHTOKEN_SECRET;
      jwt.verify(refreshToken, secret, (err, payload) => {
        if (err) {
          console.log(err.message);
          return reject(createError.Unauthorized());
        }

        const userId = payload.aud;
        client.get(userId, (err, result) => {
          if (err) {
            console.log(err.message);
            return reject(createError.InternalServerError());
          }
          if (refreshToken !== result) {
            console.log('cookie ref token !== db ref token');
            return reject(createError.Unauthorized());
          }
          return resolve(payload.aud);
        });
      });
    });
  },
};
