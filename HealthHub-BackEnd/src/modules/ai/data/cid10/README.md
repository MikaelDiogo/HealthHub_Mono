# Tabela CID-10 do DATASUS (conferência local dos códigos sugeridos pela IA)

Estes arquivos são a **tabela oficial da CID-10 publicada pelo DATASUS (Ministério da Saúde)**, copiados **sem alterar nenhum byte** (ISO-8859-1, fim de linha CRLF, separador `;`). O Git trata os dois como binários (`.gitattributes` na raiz do repositório), para não converter fim de linha. O serviço `Cid10Service` (`../../application/cid10.service.ts`) confere cada código sugerido pela IA contra eles, **só no servidor**: nada desta tabela é enviado à Groq.

## Fonte
| Item | Valor |
|---|---|
| Página | http://www2.datasus.gov.br/cid10/V2008/download.htm (arquivo `CID10CSV.zip`) |
| Órgão | DATASUS, Ministério da Saúde |
| Versão | **CID-10, versão 2008** |
| Arquivo baixado pelo autor | `CID10CSV.zip`, 306.066 bytes, SHA-256 `84f23809275575f751255048064bbb244b0de33fd5987ab98df0f98e5f5d2c95` |
| Data de modificação dos arquivos dentro do ZIP | `CID-10-SUBCATEGORIAS.CSV`: 01/10/2007 16:07; `CID-10-CATEGORIAS.CSV`: 01/10/2007 16:54 (carimbos gravados no ZIP) |
| Data em que esta cópia entrou no repositório | 24/11/2026 (o autor baixou o ZIP da página oficial e o forneceu; o Claude Code não baixou de novo) |

Do ZIP (seis arquivos) **só dois** entram aqui. Os outros (capítulos, grupos e a classificação de oncologia) não foram copiados.

## Arquivos
| Arquivo | Linhas de dados (sem o cabeçalho) | SHA-256 |
|---|---|---|
| `CID-10-SUBCATEGORIAS.CSV` | 12.451 (12.188 com código de 4 caracteres e 263 com código de 3 caracteres) | `1a85bef8f2065ad3e95ab07b6441e6f03404c54ab35849ebd4edccc3ba234e60` |
| `CID-10-CATEGORIAS.CSV` | 2.045 | `e372033b1c04f321a9a98aac8534f2bd4f22aa40c622525b619a2f616a3b6fc8` |

Cabeçalhos: `SUBCAT;CLASSIF;RESTRSEXO;CAUSAOBITO;DESCRICAO;DESCRABREV;REFER;EXCLUIDOS;` e `CAT;CLASSIF;DESCRICAO;DESCRABREV;REFER;EXCLUIDOS;`. A descrição oficial é a coluna `DESCRICAO`. Os 263 códigos de 3 caracteres do arquivo de subcategorias são categorias que não têm subcategorias (por exemplo `I10`).

## Limites desta tabela
- É a **versão 2008**. Códigos criados depois **podem não constar**. Verificado nestes arquivos: `U07` e `U07.1` (COVID-19) **não constam**.
- A conferência diz apenas se o código existe na tabela e mostra a descrição oficial; **não** diz se o código é o correto para o paciente. A decisão clínica é do profissional.

## Licença e atribuição
O órgão que disponibiliza a CID-10 na página de download é o **CBCD (Centro Brasileiro de Classificação de Doenças)**. O texto abaixo foi **fornecido pelo autor** no pedido da rodada 5 (continuação), atribuído à página http://www2.datasus.gov.br/cid10/V2008/download.htm:

> "O CBCD disponibiliza a CID-10, versão eletrônica, em diversos formatos e padrões, estimulando, assim, a utilização da mesma e permitindo a melhoria da qualidade da informação fornecida."

- **Data de leitura registrada:** 24/11/2026 (a data de hoje, como pedido).
- **Não conferido por mim:** a página não abriu a partir do ambiente do Claude Code (conexão recusada; tentei duas vezes em 24/11/2026). Por isso **não verifiquei** se a frase da página é idêntica a esta nem li o restante da página.
- **Alcance da frase:** ela diz que o CBCD disponibiliza a tabela e estimula a utilização. **Não é uma licença formal** e este repositório **não afirma** que há licença nem termos de uso na página. Atribuição: tabela CID-10, DATASUS/Ministério da Saúde (CBCD), versão 2008.

## Quando mudar esta tabela
Qualquer troca de arquivo muda os SHA-256 acima, e o teste `cid10-assets.spec.ts` falha até este README ser atualizado.
