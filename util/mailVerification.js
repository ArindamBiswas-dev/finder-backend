const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const createError = require('http-errors');

const CLIENT_ID = process.env.MAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.MAIL_CLIENT_SECRET;
const REDIRECT_URI = process.env.MAIL_REDIRECT_URI;
const REFRESH_TOKEN = process.env.MAIL_REFRESH_TOKEN;

const JWT_MAIL_VERIFICATION_SECRET = process.env.JWT_MAIL_VERIFICATION_SECRET;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function sendVerificationMail(userMail, name) {
  try {
    const token = await signJWTwithEmail(userMail);
    // const accessToken = await oAuth2Client.getAccessToken();
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        // type: 'OAuth2',
        user: 'arindambiswas290@gmail.com',
        // clientId: CLIENT_ID,
        // clientSecret: CLIENT_SECRET,
        // refreshToken: REFRESH_TOKEN,
        // accessToken: accessToken,
        pass: 'kHGyLwPhJ4GgLRR',
      },
    });
    const mailOptions = {
      from: 'Finder <arindambiswas290@gmail.com>',
      to: userMail,
      subject: 'Verify your account',
      text: 'Verify your Finder account',
      html: `
        <h3>Hello, ${name}</h3>
        <p>You're almost ready to get started. Please click on the button below to verify your email address.</p>
        <br />
        <a href="http://localhost:5000/auth/verify/${token}" target="_blank">Verify</a>
        <br />
        <strong>Finder</strong>
      `,
    };

    const result = await transport.sendMail(mailOptions);
    return result;
  } catch (error) {
    return error;
  }
}

function getEmailFromJWT(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_MAIL_VERIFICATION_SECRET, (err, payload) => {
      if (err) {
        console.log('verification mail sending error', err.message);
        return reject(err);
      }
      return resolve(payload.aud);
    });
  });
}

function signJWTwithEmail(email) {
  const payload = {
    iss: 'finder',
    aud: email,
  };
  const options = {
    expiresIn: '10d',
  };

  return new Promise((resolve, reject) => {
    jwt.sign(payload, JWT_MAIL_VERIFICATION_SECRET, options, (err, token) => {
      if (err) {
        console.log(err.message);
        return reject(createError.InternalServerError());
      }
      return resolve(token);
    });
  });
}

module.exports = { sendVerificationMail, getEmailFromJWT };
