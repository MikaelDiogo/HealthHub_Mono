# Como fazer o ensaio (passo a passo)

Você vai fazer **32 medições** (2 de treino + 30 valendo): para cada um dos 5 casos fictícios, 3 vezes, uma no **papel** e uma no **HealthHub**. O cronômetro grava os tempos sozinho na planilha. Leva umas 2 a 3 horas; pode parar e continuar outro dia (o que já foi gravado fica).

## Antes de começar (uma vez)
1. Abra o **Docker Desktop** e espere ele ficar verde.
2. **Imprima** (ou deixe aberto em outra tela) estes dois arquivos desta pasta, abrindo no navegador:
   - `cartoes_caso.html` (um cartão por paciente) e
   - `formulario_papel.html` (a ficha de papel; imprima umas 20 folhas).
3. Dê **dois cliques em `INICIAR_ENSAIO.bat`**. Ele sobe tudo sozinho e abre duas páginas:
   - **Cronômetro:** http://localhost:3030
   - **HealthHub:** http://localhost:5173 (entre com as contas do arquivo `credenciais_ensaio.txt`, que está nesta pasta; use recepção ou enfermagem).
   A IA do sistema fica **simulada** (nada é cobrado).

## Em cada rodada (a página do cronômetro mostra qual é)
1. A página diz o **caso**, o **método** (PAPEL ou SISTEMA) e mostra o **cartão** com os dados.
2. Se for **SISTEMA**: clique em **"1. Deixar o sistema limpo"** (apaga os pacientes da rodada anterior).
3. Clique em **"2. Iniciar"** (ou barra de espaço) e faça o trabalho:
   - **Papel:** preencha a ficha com os dados do cartão (cadastro, sinais vitais, motivo e a cor).
   - **Sistema:** no HealthHub, cadastre o paciente, admita na esteira, registre os sinais vitais e escolha a cor do cartão. Use as contas certas de cada perfil (recepção cadastra e admite; enfermagem registra sinais e escolhe a cor).
4. Quando terminar e conferir, clique em **"3. Parar"** (ou barra de espaço).
5. Preencha o formulário que aparece: campos completos? quantos erros ou omissões? falhas? precisou de ajuda? observações.
6. Clique em **"Salvar e ir para a próxima rodada"**. Pronto: o tempo já está na planilha.

## Regras importantes
- As **2 primeiras linhas** são de treino (familiarização): faça, mas elas não entram na conta.
- Siga a **ordem que a página mostra** (ela alterna papel e sistema de propósito).
- **Nada é apagado.** Se errar e repetir uma linha, a nova medição vira uma linha extra marcada "TENTATIVA ADICIONAL" e a anterior continua lá. Se precisar desistir no meio, use "Cancelar esta medição".
- Não mexa no relógio do computador.
- Este ensaio é seu, sozinho: tem viés de familiaridade e não mede satisfação de enfermeiros.

## Quando terminar
1. Dê dois cliques em **`PARAR_ENSAIO.bat`** (desliga tudo; a planilha fica).
2. Me avise ("terminei o ensaio"). Eu rodo a análise (média, mediana, tabela e gráfico) e coloco no `RESULTADOS_PARA_TCC.md`.

## Se algo der errado
- "Docker não está rodando": abra o Docker Desktop e rode o `.bat` de novo.
- A página do cronômetro não abre: rode `INICIAR_ENSAIO.bat` de novo (ele reinicia tudo, sem apagar a planilha).
- Os arquivos `.log` desta pasta ajudam a achar o problema; me mande o que aparecer.

Arquivos desta pasta: `coleta_ensaio.csv` (a planilha com os tempos), `coleta_ensaio_registro.jsonl` (registro de tudo que foi gravado ou cancelado), `coleta_ensaio.bak` (cópia da versão anterior).
