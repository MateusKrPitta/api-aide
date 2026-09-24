"use strict";

const fs = require("fs");
const path = require("path");

process.env.HOST = process.env.HOST || "0.0.0.0";
process.env.ENV_SILENT = "true";

// Garante que o arquivo .env exista no container para o Adonis não travar
const envPath = path.join(__dirname, ".env");
if (!fs.existsSync(envPath)) {
  try {
    fs.writeFileSync(envPath, "");
  } catch (e) {
    console.warn("Nao foi possivel criar .env silencioso:", e.message);
  }
}

if (process.env.RAILWAY_ENVIRONMENT) {
  process.env.NODE_ENV = process.env.NODE_ENV || "production";
} else {
  require("dotenv").config();
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
