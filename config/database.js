"use strict";

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use("Env");

/** @type {import('@adonisjs/ignitor/src/Helpers')} */
const Helpers = use("Helpers");

module.exports = {
  /*
  |--------------------------------------------------------------------------
  | Default Connection
  |--------------------------------------------------------------------------
  |
  | Define a conexão padrão que será usada em todo o sistema.
  |
  */
  connection: Env.get("DB_CONNECTION", "pg"),

  /*
  |--------------------------------------------------------------------------
  | PostgreSQL (Configuração para Railway)
  |--------------------------------------------------------------------------
  */
  pg: {
    client: "pg",
    connection: {
      host: Env.get("DB_HOST", Env.get("PGHOST")),
      port: Env.get("DB_PORT", Env.get("PGPORT", 5432)),
      user: Env.get("DB_USER", Env.get("PGUSER")),
      password: Env.get("DB_PASSWORD", Env.get("PGPASSWORD")),
      database: Env.get("DB_DATABASE", Env.get("PGDATABASE")),
      ssl: {
        rejectUnauthorized: false, // Necessário para conexões SSL do Railway
      },
    },
    migrations: {
      tableName: "migrations",
    },
    debug: Env.get("DB_DEBUG", false),
    pool: {
      // Configuração recomendada para produção
      min: 2,
      max: 10,
    },
  },

  /*
  |--------------------------------------------------------------------------
  | Sqlite (para desenvolvimento local)
  |--------------------------------------------------------------------------
  */
  sqlite: {
    client: "sqlite3",
    connection: {
      filename: Helpers.databasePath(
        `${Env.get("DB_DATABASE", "development")}.sqlite`
      ),
    },
    useNullAsDefault: true,
    debug: Env.get("DB_DEBUG", false),
  },
};
