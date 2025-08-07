"use strict";

const Schema = use("Schema");

class AddQuantidadeParcelasToContasReceberSchema extends Schema {
  up() {
    this.table("contas_receber", (table) => {
      table.integer("quantidade_parcelas").nullable();
    });
  }

  down() {
    this.table("contas_receber", (table) => {
      table.dropColumn("quantidade_parcelas");
    });
  }
}

module.exports = AddQuantidadeParcelasToContasReceberSchema;
