"use strict";

const { Ignitor } = require("@adonisjs/ignitor");

new Ignitor(require("@adonisjs/fold"))
  .appRoot(__dirname)
  .fireHttpServer()
  .catch(console.error)
  .then(async () => {
    try {
      const OrcamentoServico = use("App/Models/OrcamentoServico");
      
      const last = await OrcamentoServico.query().orderBy('id', 'desc').first();
      console.log("Ultimo registro toJSON:", last.toJSON());
      
      process.exit(0);
    } catch (error) {
      console.error("Erro no script:", error);
      process.exit(1);
    }
  });
