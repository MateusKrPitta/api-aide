"use strict";

const Schema = use("Schema");

class AddResponsavelToClientesTable extends Schema {
  up() {
    this.table("clientes", (table) => {
      // Adiciona a coluna responsavel
      table.string("responsavel", 100).nullable();
    });
  }

  down() {
    this.table("clientes", (table) => {
      // Remove a coluna se for necessário reverter
      table.dropColumn("responsavel");
    });
  }
}

module.exports = AddResponsavelToClientesTable;
