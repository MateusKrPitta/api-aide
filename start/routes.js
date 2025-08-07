"use strict";

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use("Route");

Route.get("/", () => {
  return { greeting: "Hello world in JSON" };
});

Route.post("/usuario", "AuthController.register");
Route.post("/login", "AuthController.login");

Route.group(() => {
  Route.get("categorias", "CategoriaController.index");
  Route.post("categorias", "CategoriaController.store");
  Route.get("categorias/:id", "CategoriaController.show");
  Route.put("categorias/:id", "CategoriaController.update");
  Route.delete("categorias/:id", "CategoriaController.destroy");
  Route.put("categorias/:id/reativar", "CategoriaController.reativar");

  Route.get("/users", "UserController.index");
  Route.get("/users/:id", "UserController.show");
  Route.post("/users", "UserController.store");
  Route.put("/users/:id", "UserController.update");
  Route.delete("/users/:id", "UserController.destroy");
  Route.put("/users/:id/ativar", "UserController.ativar");
  Route.put("/users/:id/inativar", "UserController.inativar");

  Route.get("/servicos", "ServicoController.index");
  Route.post("/servicos", "ServicoController.store");
  Route.get("/servicos/:id", "ServicoController.show");
  Route.put("/servicos/:id", "ServicoController.update");
  Route.delete("/servicos/:id", "ServicoController.destroy");
  Route.put("/servicos/:id/reativar", "ServicoController.reativar");

  Route.post("/prestadores", "PrestadorController.store");
  Route.get("/prestadores", "PrestadorController.index");
  Route.get("/prestadores/:id", "PrestadorController.show");
  Route.put("/prestadores/:id", "PrestadorController.update");
  Route.delete("/prestadores/:id", "PrestadorController.destroy");
  Route.post("/prestadores/:id/servicos", "PrestadorController.addServicos");
  Route.delete(
    "/prestadores/:id/servicos",
    "PrestadorController.removeServicos"
  );
  Route.post("/prestadores/:id/inativar", "PrestadorController.inativar");
  Route.post("/prestadores/:id/reativar", "PrestadorController.reativar");

  Route.post("/clientes", "ClienteController.store");
  Route.get("/clientes", "ClienteController.index");
  Route.get("/clientes/:id", "ClienteController.show");
  Route.put("/clientes/:id", "ClienteController.update");
  Route.delete("/clientes/:id", "ClienteController.destroy");
  Route.post("/clientes/:id/inativar", "ClienteController.inativar");
  Route.post("/clientes/:id/reativar", "ClienteController.reativar");

  Route.post("/tipo-palestras", "TipoPalestraController.store");
  Route.get("/tipo-palestras", "TipoPalestraController.index");
  Route.get("/tipo-palestras/:id", "TipoPalestraController.show");
  Route.put("/tipo-palestras/:id", "TipoPalestraController.update");
  Route.post("/tipo-palestras/:id/inativar", "TipoPalestraController.inativar");
  Route.post("/tipo-palestras/:id/reativar", "TipoPalestraController.reativar");

  Route.get("palestra_cursos", "PalestraCursoController.index");
  Route.post("palestra_cursos", "PalestraCursoController.store");
  Route.get("palestra_cursos/:id", "PalestraCursoController.show");
  Route.put("palestra_cursos/:id", "PalestraCursoController.update");
  Route.delete("palestra_cursos/:id", "PalestraCursoController.destroy");

  Route.get("orcamentos", "OrcamentoController.index");
  Route.post("orcamentos", "OrcamentoController.store");
  Route.put("orcamentos/:id", "OrcamentoController.update").middleware([
    "auth",
  ]);
  Route.delete("orcamentos/:id", "OrcamentoController.destroy");

  Route.get("/relatorios", "OrcamentoRelatorioController.index"); // Lista todos (com filtros)
  Route.get("/relatorios/:id", "OrcamentoRelatorioController.show"); // Mostra um específico
  Route.put(
    "/relatorios/:id/status",
    "OrcamentoRelatorioController.updatePaymentStatus"
  );
  Route.put(
    "orcamento-relatorio/:id",
    "OrcamentoRelatorioController.updatePaymentStatus"
  );
  Route.put(
    "orcamentos/parcelas/:id/status",
    "OrcamentoRelatorioController.updatePaymentStatus"
  ).middleware("auth");

  Route.post(
    "/palestra_cursos/:id/gerar-relatorios",
    "RelatorioPalestraCursoController.gerarRelatorios"
  ).middleware("auth");
  Route.get("pagamentos", "RelatorioPalestraCursoController.listAllPagamentos");
  Route.put(
    "/pagamentos/:id",
    "RelatorioPalestraCursoController.updateParcelaStatus"
  );

  Route.get("/movimentacoes", "MovimentacaoController.index");
  Route.post("/movimentacoes", "MovimentacaoController.store");
  Route.get("/movimentacoes/:id", "MovimentacaoController.show");
  Route.put("/movimentacoes/:id", "MovimentacaoController.update");
  Route.delete("/movimentacoes/:id", "MovimentacaoController.destroy");

  Route.put(
    "parcelas/:id/status",
    "ParcelaPalestraCursoController.updateStatus"
  );

  Route.get("/contas", "ContaPagarController.index");
  Route.post("/contas", "ContaPagarController.store");
  Route.put("/parcelas/:id", "ContaPagarController.updateParcela");
  Route.put(
    "parcelas-contas/:id",
    "ContaPagarController.updateParcelaIndividual"
  );
  Route.delete("contas-pagar/:id", "ContaPagarController.destroy");
  Route.put(
    "contas-pagar/parcelas/:id",
    "ContaPagarController.updateParcelaIndividual"
  );

  Route.put("contas-pagar/:id", "ContaPagarController.update");

  Route.post("contas-receber", "ContaReceberController.store");
  Route.get("contas-receber", "ContaReceberController.index");
  Route.get("contas-receber/:id", "ContaReceberController.show");
  Route.put(
    "contas-receber/parcelas/:id/pagar",
    "ContaReceberController.pagarParcela"
  );

  Route.put("contas-receber/:id", "ContaReceberController.update").middleware([
    "auth",
  ]);
  Route.delete("/contas-receber/:id", "ContaReceberController.destroy");
  Route.put(
    "contas-receber/parcelas/:id",
    "ContaReceberController.updateParcela"
  ).middleware(["auth"]);
}).middleware(["auth"]);
