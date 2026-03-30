const bcrypt = require('bcryptjs');

const password = 'DemoPass123!';
const hashInDb = '$2a$10$W8D2iGd6zkRgZNpmjQe7qeYjDdyCjTiMQuuLHfoalGexiLRNvKcFe';

bcrypt.compare(password, hashInDb).then(res => {
  console.log('Demo Match:', res);
});
