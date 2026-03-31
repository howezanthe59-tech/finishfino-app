const bcrypt = require('bcryptjs');

const password = String(process.argv[2] || process.env.VERIFY_PASSWORD || '').trim();
const hashInDb = String(process.argv[3] || process.env.VERIFY_HASH || '').trim();

if (!password || !hashInDb) {
  console.error('Usage: node verify_demo.js <password> <bcryptHash>');
  process.exit(1);
}

bcrypt.compare(password, hashInDb).then(res => {
  console.log('Demo Match:', res);
});
