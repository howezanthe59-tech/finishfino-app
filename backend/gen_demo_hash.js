const bcrypt = require('bcryptjs');

const password = String(process.argv[2] || process.env.HASH_PASSWORD || '').trim();
if (!password) {
  console.error('Usage: node gen_demo_hash.js <password>');
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log(hash);
});
