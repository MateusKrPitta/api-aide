"use strict";

const Schema = use("Schema");

class AlterValorMensalNullable extends Schema {
  up() {
    this.table("contas_receber", (table) => {
      table.decimal("valor_mensal", 10, 2).nullable().alter();
      table.decimal("valor_total", 10, 2).nullable().alter();
      table.date("data_fim").nullable().alter(); // só se quiser permitir null aqui também
    });
  }

  down() {
    this.table("contas_receber", (table) => {
      table.decimal("valor_mensal", 10, 2).notNullable().alter();
      table.decimal("valor_total", 10, 2).notNullable().alter();
      table.date("data_fim").notNullable().alter();
    });
  }
}

module.exports = AlterValorMensalNullable;
