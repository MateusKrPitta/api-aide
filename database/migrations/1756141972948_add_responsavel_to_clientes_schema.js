"use strict";

const Schema = use("Schema");

class AddResponsavelToClientesTable extends Schema {
  async up() {
    const exists = await this.hasColumn("clientes", "responsavel");
    if (!exists) {
      this.table("clientes", (table) => {
        table.string("responsavel", 100).nullable();
      });
    }
  }

  down() {
    this.table("clientes", (table) => {
      // Remove a coluna se for necessário reverter
      table.dropColumn("responsavel");
    });
  }
}

module.exports = AddResponsavelToClientesTable;
