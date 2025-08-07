"use strict";

// Carrega variáveis de ambiente
if (process.env.RAILWAY_ENVIRONMENT) {
  process.env.NODE_ENV = process.env.NODE_ENV || "production";
} else {
  require("dotenv").config();
}

// Verifique se já existe uma instância do Ignitor
if (!global.IGNITOR_INSTANCE) {
  const { Ignitor } = require("@adonisjs/ignitor");
  global.IGNITOR_INSTANCE = new Ignitor(require("@adonisjs/fold"))
    .appRoot(__dirname)
    .fireHttpServer()
    .catch(console.error);
}
/*
|--------------------------------------------------------------------------
| Http server
|--------------------------------------------------------------------------
|
| This file bootstraps Adonisjs to start the HTTP server. You are free to
| customize the process of booting the http server.
|
| """ Loading ace commands """
|     At times you may want to load ace commands when starting the HTTP server.
|     Same can be done by chaining `loadCommands()` method after
|
| """ Preloading files """
|     Also you can preload files by calling `preLoad('path/to/file')` method.
|     Make sure to pass a relative path from the project root.
*/

const { Ignitor } = require("@adonisjs/ignitor");

new Ignitor(require("@adonisjs/fold"))
  .appRoot(__dirname)
  .fireHttpServer()
  .catch(console.error);
