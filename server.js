"use strict";

// Carrega variáveis de ambiente
if (process.env.RAILWAY_ENVIRONMENT) {
  process.env.NODE_ENV = process.env.NODE_ENV || "production";
} else {
  require("dotenv").config();
}

// Única instância do Ignitor
const { Ignitor } = require("@adonisjs/ignitor");

new Ignitor(require("@adonisjs/fold"))
  .appRoot(__dirname)
  .fireHttpServer()
  .catch(console.error);
