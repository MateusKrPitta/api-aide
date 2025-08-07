"use strict";

const Schema = use("Schema");

class AddStatusToContasReceber extends Schema {
  up() {
    this.table("contas_receber", (table) => {
      // Adiciona a coluna status
      table
        .integer("status")
        .notNullable()
        .defaultTo(1)
        .comment("1=Pendente, 2=Pago, 3=Parcial");
    });
  }

  down() {
    this.table("contas_receber", (table) => {
      // Remove a coluna em caso de rollback
      table.dropColumn("status");
    });
  }
}

module.exports = AddStatusToContasReceber;
