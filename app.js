const express = require('express');
const createError = require('http-errors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();
require('./util/init_redis');

// routes
const ApiRoute = require('./routes/api.route');
const AuthRoute = require('./routes/auth.route');
const { verifyAccessToken } = require('./util/jwtHelper');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));
app.use(cookieParser());

app.get('/', verifyAccessToken, async (req, res, next) => {
  res.send({ message: 'Awesome it works 🐻' });
});

app.use('/api', ApiRoute);
app.use('/auth', AuthRoute);

app.use((req, res, next) => {
  next(createError.NotFound('Page does not exist'));
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send({
    status: err.status || 500,
    message: err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 @ http://localhost:${PORT}`));
