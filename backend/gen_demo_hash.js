const bcrypt = require('bcryptjs');

bcrypt.hash('DemoPass123!', 10).then(hash => {
  console.log(hash);
});
