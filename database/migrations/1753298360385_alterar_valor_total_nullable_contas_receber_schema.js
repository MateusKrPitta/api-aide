"use strict";

const Schema = use("Schema");

class AlterarValorTotalNullableContasReceberSchema extends Schema {
  up() {
    this.alter("contas_receber", (table) => {
      table.decimal("valor_total", 10, 2).nullable().alter();
    });
  }

  down() {
    this.alter("contas_receber", (table) => {
      table.decimal("valor_total", 10, 2).notNullable().alter();
    });
  }
}

module.exports = AlterarValorTotalNullableContasReceberSchema;
