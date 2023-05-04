const mysql = require('mysql');

var connection = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Noctis@k47',
  database: 'vacCenter',
});

module.exports = connection;
