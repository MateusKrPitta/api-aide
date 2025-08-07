"use strict";

const Model = use("Model");

class RelatorioPalestraCurso extends Model {
  static get table() {
    return "relatorio_palestra_cursos";
  }

  palestraCurso() {
    return this.belongsTo(
      "App/Models/PalestraCurso",
      "palestra_curso_id",
      "id"
    );
  }
}

module.exports = RelatorioPalestraCurso;
