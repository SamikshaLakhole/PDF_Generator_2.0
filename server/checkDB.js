const knex = require("./db");

async function checkTables() {
  const tables = await knex("sqlite_master")
    .select("name")
    .where("type", "table");

  console.log("Tables in the database:", tables.map((t) => t.name));

  knex.destroy();
}

checkTables();
