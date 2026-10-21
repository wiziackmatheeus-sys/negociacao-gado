# Controle de compras de gado — protótipo do escritório

Rascunho funcional baseado nas abas **Layout** e **Pesagem** da planilha enviada. O sistema organiza uma ficha por compra e liga a pesagem aos cálculos comerciais. Não importa o arquivo XLSM nem executa macros.

## Funcionalidades

- Cadastro de fornecedor, empresas compradoras, destino, categoria, raça, finalidade, responsáveis e O.C.
- Até nove grupos de pesagem com pesos individuais e rendimento próprio; descontos de cabeças, peso e valor.
- Cálculo de preço por arroba, rendimento ponderado, arrobas estimadas, valor do gado, Funrural, corretagem, total bruto e líquido.
- Até 22 notas fiscais por compra; acerto de nota complementar ou devolução e quebra de viagem.
- Dados de depósito, observações, busca, filtros, impressão da ficha e backup JSON.

## Regras de cálculo

As principais fórmulas são equivalentes às células `Pesagem!C47:C54` e `Layout!I24,I32,N10:N24,N29:N30,N43`. O valor por arroba do romaneio usa **kg ÷ 30**; o valor do gado usa **kg × rendimento ÷ 15**. A alíquota do Funrural depende dos tipos do fornecedor e da compradora, e da opção informada. A opção `% valor da @` da corretagem segue a expressão da planilha: percentual × preço por arroba × cabeças. O frete previsto é um campo informativo.

Os cálculos foram comparados com os resultados armazenados no arquivo de referência para um caso de 80 cabeças: 30.231 kg, rendimento de 50%, preço R$ 400,606579/@, valor do gado R$ 403.691,25 e retenção de R$ 807,3825. Isso valida esse caso, mas não substitui conferência das demais situações fiscais e operacionais.

## Rodar e publicar

Abra `index.html` em um navegador. Não há instalação nem build. Para publicar o rascunho, em **Settings → Pages → Build and deployment**, escolha **Deploy from a branch**, a branch **main** e a pasta **/(root)**. O endereço esperado após a publicação é `https://wiziackmatheeus-sys.github.io/negociacao-gado/`.

## Limites do protótipo

O repositório e o Pages são públicos. Nenhum dado da planilha foi incorporado ao código. Os registros são armazenados só no `localStorage` do navegador e não são sincronizados entre usuários ou dispositivos. **Não use informações reais de compras, notas, CPF/CNPJ ou banco nessa versão.** Para uso pelo escritório, a próxima etapa é autenticação, banco de dados privado, permissões, histórico de alterações e integração controlada com o outro sistema de coleta.

O backup JSON salva os dados inseridos no navegador; guarde-o em local seguro. A importação aceita somente backups desta versão, acrescenta IDs ainda ausentes e não substitui registros existentes.
