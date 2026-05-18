"use strict";

const Schema = use("Schema");

class AddDestinoToOrcamentoServicosTable extends Schema {
  up() {
    this.table("orcamento_servicos", (table) => {
      table.string("destino").defaultTo("receber");
    });
  }

  down() {
    this.table("orcamento_servicos", (table) => {
      table.dropColumn("destino");
    });
  }
}

module.exports = AddDestinoToOrcamentoServicosTable;
