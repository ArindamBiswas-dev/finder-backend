const { default: slugify } = require('slugify');
var randomstring = require('randomstring');

const createUniqueSlug = (title) => {
  // slugify the title
  let slug = slugify(title, {
    replacement: '-',
    remove: undefined,
    lower: true,
    strict: false,
    locale: 'vi',
    trim: true,
  });

  // create random string of length 4
  const randomId = randomstring.generate(4);

  // merge slug and random string
  slug = `${slug}-${randomId}`;
  return slug;
};

module.exports = { createUniqueSlug };
