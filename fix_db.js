"use strict";

const { Ignitor } = require("@adonisjs/ignitor");
const path = require("path");

new Ignitor(require("@adonisjs/fold"))
  .appRoot(__dirname)
  .fireHttpServer()
  .catch(console.error)
  .then(async () => {
    try {
      const Database = use("Database");
      console.log("Verificando se a coluna is_servico_aide existe...");
      
      const res = await Database.raw("SELECT column_name FROM information_schema.columns WHERE table_name = 'orcamento_servicos' AND column_name = 'is_servico_aide'");
      
      if (res.rows && res.rows.length === 0) {
        console.log("Coluna não encontrada. Adicionando coluna is_servico_aide...");
        await Database.raw("ALTER TABLE orcamento_servicos ADD COLUMN is_servico_aide BOOLEAN DEFAULT false");
        console.log("Coluna adicionada com sucesso!");
      } else {
        console.log("A coluna is_servico_aide já existe no banco de dados.");
      }
      
      process.exit(0);
    } catch (error) {
      console.error("Erro ao consertar o banco:", error);
      process.exit(1);
    }
  });
