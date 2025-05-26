require("dotenv").config();
const path = require("path");

module.exports = {
  development: {
    client: process.env.DB_CLIENT,
    connection: {
      filename: path.join(__dirname, process.env.DB_FILENAME),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, "migrations"),
    },
  },
};
