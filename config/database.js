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
  | PostgreSQL
  |--------------------------------------------------------------------------
  |
  | Configuração da conexão com o banco PostgreSQL.
  |
  | Instale o driver com:
  | npm i --save pg
  |
  */
  pg: {
    client: "pg",
    connection: {
      host: Env.get("DB_HOST", "127.0.0.1"),
      port: Env.get("DB_PORT", 5432),
      user: Env.get("DB_USER", "postgres"),
      password: Env.get("DB_PASSWORD", "postgres"),
      database: Env.get("DB_DATABASE", "adonis"),
    },
    debug: Env.get("DB_DEBUG", false),
  },

  /*
  |--------------------------------------------------------------------------
  | Sqlite (caso ainda queira para testes)
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

  /*
  |--------------------------------------------------------------------------
  | MySQL (caso use em outro projeto)
  |--------------------------------------------------------------------------
  */
  mysql: {
    client: "mysql",
    connection: {
      host: Env.get("DB_HOST", "127.0.0.1"),
      port: Env.get("DB_PORT", 3306),
      user: Env.get("DB_USER", "root"),
      password: Env.get("DB_PASSWORD", ""),
      database: Env.get("DB_DATABASE", "adonis"),
    },
    debug: Env.get("DB_DEBUG", false),
  },
};
