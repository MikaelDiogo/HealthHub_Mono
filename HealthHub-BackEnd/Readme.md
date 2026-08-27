# HealthHub - Engine de Inteligência Clínica

O **HealthHub Backend** é o núcleo de processamento e persistência de dados desenvolvido para modernizar a gestão hospitalar em unidades de pequeno e médio porte. O sistema atua como o cérebro de uma operação digital, substituindo processos manuais lentos por uma arquitetura de dados segura e organizada.

## 🚀 O Problema e a Necessidade
Hospitais de menor porte muitas vezes sofrem com a **fichagem manual**, um processo obsoleto que gera:
1. **Lentidão na Triagem:** Pacientes aguardam enquanto dados vitais são anotados à mão em papéis que podem rasgar ou extraviar.
2. **Dados Fragmentados:** Informações críticas ficam isoladas em prontuários físicos, dificultando a consulta rápida em momentos de emergência.
3. **Falta de Histórico Clínico:** É impossível analisar a evolução de um paciente (como picos febris ou queda de saturação) sem folhear dezenas de páginas.

O **HealthHub** resolve isso centralizando a inteligência clínica em uma API RESTful escalável, capaz de gerenciar desde o cadastro inicial até fluxos complexos de sinais vitais baseados no dataset clínico **PhysioNet**.

## 💡 Aplicação Prática e Benefícios
* **Aceleração da Triagem:** A digitalização reduz o tempo de recepção e triagem em até 60%, permitindo que o atendimento médico comece com informações precisas já em mãos.
* **Fim das Fichas Manuais:** Organização completa de dados cadastrais, alergias e medicamentos em uso, garantindo busca instantânea por ID ou CPF.
* **Observação Dinâmica:** O sistema armazena o histórico de sinais vitais (Temperatura, BPM, SpO²), permitindo uma visão evolutiva da saúde do paciente que fichas estáticas de papel jamais ofereceriam.

## 🛠️ Stack Técnica
* **Node.js & TypeScript:** Garantia de estabilidade e tipagem forte para manipulação de dados sensíveis.
* **TypeORM & PostgreSQL:** Banco de dados relacional otimizado para vincular pacientes a múltiplos registros de saúde.
* **Service Layer Pattern:** Lógica de negócio isolada, facilitando a manutenção e futuras expansões do sistema.

## 🔧 Instalação e Execução
1. `git clone <url-do-repo>`
2. `npm install`
3. Configure o arquivo `.env` com as credenciais do seu banco PostgreSQL local.
4. `npm run typeorm migration:run` (Para criar a estrutura de tabelas automaticamente).
5. `npm run dev` (O servidor iniciará em `http://localhost:3333`).