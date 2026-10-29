# 12 — Documentação da API (Swagger)

Adicionado `@nestjs/swagger@^7.4.2` (compatível com Nest 10). Código: `HealthHub-BackEnd/src/config/swagger.ts`, ligação em `src/main.ts`, plugin em `nest-cli.json` (gera os schemas a partir dos DTOs do class-validator), anotações `@ApiTags`/`@ApiBearerAuth`/`@ApiOperation` nos 9 controllers (a descrição de cada rota traz os perfis do `@Roles`).

| Prova | Resultado | Log |
|---|---|---|
| Teste escrito antes (falhou: módulo inexistente) | 1 arquivo falhou | `logs/swagger_antes.log` |
| Depois: cobertura (todo controller com tag; toda rota com resumo; Bearer exceto login) e regra de ligar/desligar | backend **14 arquivos / 115 testes** passando; `tsc` e build com código 0 | `logs/swagger_depois_testes.log`, `logs/swagger_build.log` |
| API real (banco de teste, mock de IA) | `/api/docs` 200, `/api/docs-json` 200: **26 operações**, 16 schemas; `UpdateFilaDto.justificativa` com `maxLength: 500`; `/login` sem exigência de token | `logs/swagger_openapi.json`, `logs/swagger_api_run.log` |
| Produção (`NODE_ENV=production`) | `/api/docs` e `/api/docs-json` → **404** | `logs/swagger_prod_run.log` |

Detalhe de segurança: o Helmet continua ativo; só o caminho `/api/docs*` fica sem CSP (a interface do Swagger usa scripts inline). As demais rotas mantêm a CSP.

**Não prova:** que cada descrição de corpo/resposta é exata (schemas vêm de introspecção; respostas não foram tipadas), nem que a documentação deva ficar exposta em produção. Rotas do Socket.IO (tempo real) não aparecem no Swagger. Não existe perfil administrador.
