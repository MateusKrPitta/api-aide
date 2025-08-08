"use strict";

const Env = use("Env");
const Helpers = use("Helpers");

module.exports = {
  connection: Env.get("DB_CONNECTION", "pg"),

  pg: {
    client: "pg",
    connection: {
      host: Env.get("PG_HOST"), // Use apenas PG_HOST
      port: Env.get("PG_PORT", 5432),
      user: Env.get("PG_USER"),
      password: Env.get("PG_PASSWORD"),
      database: Env.get("PG_DATABASE"),
      ssl: {
        rejectUnauthorized: false, // Crucial para Railway
      },
    },
    migrations: {
      tableName: "adonis_migrations", // Padrão do Adonis
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
