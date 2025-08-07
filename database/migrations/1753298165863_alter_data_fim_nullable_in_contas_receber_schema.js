"use strict";

const Schema = use("Schema");

class AlterDataFimNullableInContasReceberSchema extends Schema {
  up() {
    this.alter("contas_receber", (table) => {
      table.date("data_fim").nullable().alter();
    });
  }

  down() {
    this.alter("contas_receber", (table) => {
      table.date("data_fim").notNullable().alter();
    });
  }
}

module.exports = AlterDataFimNullableInContasReceberSchema;
