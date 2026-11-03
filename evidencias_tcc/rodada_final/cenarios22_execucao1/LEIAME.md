# Execução 1 dos 22 cenários (commit 1948b84, clone limpo) — preservada como evidência de falha

Resultado: F01–F14, F16, F17 aprovados (F06 já com HTTP 409, contrato novo da Tarefa 1); **F15 e C01–C05 reprovados**. Causas (nenhuma é defeito do sistema, ambas são de ambiente/script desatualizado):
- **C01–C05:** os scripts leem o campo `gravidade_manchester` da visita; ele foi renomeado para `classificacao_risco` na migração Manchester → classificação de risco. O script lê `undefined` e registra desvio.
- **F15:** o script procura o contato "Enfermeiro Teste"; no banco novo (seed do zero) o enfermeiro do seed tem outro nome (o do autor), então o médico não achou o contato e a resposta não foi enviada.
As capturas de tela desta execução foram **descartadas** porque mostravam o nome real do autor (usuário do seed). Os logs e o JSON não contêm o nome.
A execução 2 (arquivo `../cenarios22/`) usa o banco renomeado e cópias dos scripts só com `gravidade_manchester` → `classificacao_risco`.
