"use strict";

const Env = use("Env");
const Helpers = use("Helpers");

module.exports = {
  connection: Env.get("DB_CONNECTION", "pg"),

  pg: {
    client: "pg",
    connection: {
      host: Env.get("DB_HOST"),
      port: Env.get("DB_PORT", 5432),
      user: Env.get("DB_USER"),
      password: Env.get("DB_PASSWORD"),
      database: Env.get("DB_DATABASE"),
      ssl: {
        rejectUnauthorized: false, // Importante para Railway
      },
    },
    migrations: {
      tableName: "adonis_migrations",
    },
    debug: Env.get("DB_DEBUG", false),
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
    },
  },

  sqlite: {
    client: "sqlite3",
    connection: {
      filename: Helpers.databasePath(
        `${Env.get("DB_DATABASE", "development")}.sqlite`
      ),
    },
    useNullAsDefault: true,
  },
};
