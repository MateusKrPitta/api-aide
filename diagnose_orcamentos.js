const Database = use("Database");

async function diagnose() {
  try {
    console.log('Listing recent orçamentos and their financial status...');

    const orcamentos = await Database.table('orcamentos')
      .orderBy('id', 'desc')
      .limit(5);

    for (const orc of orcamentos) {
      console.log(`\n--- Orcamento ID: ${orc.id} | Nome: ${orc.nome} ---`);

      const crParcelas = await Database.table('contas_receber_parcelas')
        .join('contas_receber', 'contas_receber_parcelas.conta_receber_id', 'contas_receber.id')
        .where('contas_receber.orcamento_id', orc.id)
        .select('contas_receber_parcelas.id', 'contas_receber_parcelas.status_pagamento', 'contas_receber_parcelas.status');
      
      console.log('Contas Receber Parcelas (status_pagamento):', crParcelas.map(p => p.status_pagamento));
      console.log('Contas Receber Parcelas (status):', crParcelas.map(p => p.status));

      const cpParcelas = await Database.table('contas_pagar_parcelas')
        .join('contas_pagar', 'contas_pagar_parcelas.conta_pagar_id', 'contas_pagar.id')
        .where('contas_pagar.orcamento_id', orc.id)
        .select('contas_pagar_parcelas.id', 'contas_pagar_parcelas.status');
      
      console.log('Contas Pagar Parcelas (status):', cpParcelas.map(p => p.status));
      
      const hasPaidCR = crParcelas.some(p => p.status_pagamento == 2);
      const hasPaidCP = cpParcelas.some(p => p.status == 2);
      
      console.log('Is Blocked? CR:', hasPaidCR, '| CP:', hasPaidCP);
    }

  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}

diagnose();
