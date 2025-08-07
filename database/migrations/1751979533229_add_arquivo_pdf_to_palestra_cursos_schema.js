"use strict";

const Schema = use("Schema");

class AddArquivoPdfToPalestraCursos extends Schema {
  up() {
    this.table("palestra_cursos", (table) => {
      table.string("arquivo_pdf").nullable();
    });
  }

  down() {
    this.table("palestra_cursos", (table) => {
      table.dropColumn("arquivo_pdf");
    });
  }
}

module.exports = AddArquivoPdfToPalestraCursos;
