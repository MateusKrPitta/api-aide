"use strict";

const Schema = use("Schema");

class AddIsServicoAideToOrcamentoServicosSchema extends Schema {
  up() {
    this.table("orcamento_servicos", (table) => {
      table.boolean("is_servico_aide").defaultTo(false);
    });
  }

  down() {
    this.table("orcamento_servicos", (table) => {
      table.dropColumn("is_servico_aide");
    });
  }
}

module.exports = AddIsServicoAideToOrcamentoServicosSchema;
