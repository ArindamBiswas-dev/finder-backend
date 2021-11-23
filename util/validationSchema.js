const Joi = require('joi');

const signUpAuthSchema = Joi.object({
  fullName: Joi.string().required(),
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

const logInAuthSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

module.exports = { signUpAuthSchema, logInAuthSchema };
