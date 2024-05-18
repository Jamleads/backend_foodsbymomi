const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});

db.getConnection()
  .then(() => {
    console.log("CONNECTION TO DATABASE ESTABLISHED SUCCESSFULLY!!!");
  })
  .catch((err) => console.log(err));

module.exports = db;
