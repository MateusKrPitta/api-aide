"use strict";

const Schema = use("Schema");

class AlterOrcamentoServicosDataEntregaNullableSchema extends Schema {
  up() {
    this.table("orcamento_servicos", (table) => {
      table.date("data_entrega").nullable().alter();
    });
  }

  down() {
    this.table("orcamento_servicos", (table) => {
      table.date("data_entrega").notNullable().alter();
    });
  }
}

module.exports = AlterOrcamentoServicosDataEntregaNullableSchema;
