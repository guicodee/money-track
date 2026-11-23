# Implementação de Testes Automatizados

Quero iniciar a implementação de testes automatizados na minha API. Você deverá atuar como um desenvolvedor Backend Sênior, com experiência em Node.js, TypeScript, Fastify, Drizzle ORM e PostgreSQL. Seu objetivo é me orientar na criação de uma estrutura de testes automatizados profissional, organizada, sustentável e compatível com a arquitetura atual do projeto.

A arquitetura utiliza Repository Pattern, com separação de responsabilidades entre:

- Repositories
- Services
- Controllers
- DTOs
- Factories
- Middlewares
- Schemas do Drizzle

Os módulos já implementados são:

1. Users
2. Accounts
3. Categories
4. Sessions
5. Transactions

Todos esses módulos já possuem suas respectivas implementações de repositories, services e controllers. Também existe um Job responsável pelo processamento automático de transações cuja data de ocorrência já chegou.

**Importante:** não quero reconstruir a arquitetura. Quero trabalhar sobre a estrutura existente.

## 2. Objetivo

Implementar três níveis de testes:

### A. Testes unitários

Testar principalmente os Services, verificando suas regras de negócio isoladamente.

Exemplos:

- Cadastro de usuário.
- Validação de credenciais.
- Criação de contas.
- Impedimento de acesso a recursos de outros usuários.
- Criação de categorias.
- Validação de compatibilidade entre categoria e tipo de transação.
- Criação e atualização de transações.
- Exclusão lógica de transações.
- Atualização dos saldos.
- Processamento de transações futuras.
- Prevenção de processamento duplicado.

### B. Testes de integração

Verificar a comunicação entre os Repositories e o PostgreSQL.

Exemplos:

- Inserção e consulta de usuários.
- Relacionamento entre usuários e contas.
- Relacionamento entre usuários e categorias.
- Persistência de transações.
- Constraints e integridade referencial.
- Atualização de saldo.
- Atomicidade das operações financeiras.
- Rollback em caso de falha.

### C. Testes E2E

Testar a API por meio de requisições HTTP reais, utilizando os recursos de injeção de requisições do Fastify.

Verificar:

- Status HTTP.
- Estrutura das respostas.
- Validações dos payloads.
- Autenticação.
- Autorização.
- Fluxos completos de cadastro, login e operações financeiras.
- Comportamento dos endpoints em situações de erro.

## 3. Ferramentas

Pode me dar sugestões de quais ferramentas eu posso utilizar. 
Os testes precisam respeitar as regras de negócio já estabelecidas.

### Usuários e segurança

- Cada usuário só pode acessar seus próprios dados.
- Não deve ser possível consultar, modificar ou excluir recursos pertencentes a outro usuário.
- As senhas nunca devem ser armazenadas em texto puro.
- Sessões e refresh tokens precisam respeitar suas regras de validade e revogação.

### Contas

- Um usuário não pode possuir várias contas bancarias.
- O saldo inicial e o saldo atual precisam ser tratados corretamente.
- O saldo pode ficar negativo.

### Categorias

- Cada categoria pertence a um usuário.
- Não pode haver categorias duplicadas conforme a regra de unicidade definida no banco.
- Categorias de despesa não podem ser utilizadas em receitas e vice-versa.

### Transações

- O valor precisa ser maior que zero.
- Receitas e despesas exigem categorias compatíveis.
- Transferências na V1 são apenas informativas.
- Transferências não alteram saldos e não possuem categoria.
- Transações excluídas logicamente não devem aparecer nas consultas padrão.
- Transações futuras não alteram imediatamente o saldo.
- Transações vencidas precisam ser processadas automaticamente.
- Uma transação não pode afetar o saldo duas vezes.
- Atualizações e exclusões precisam preservar a consistência financeira.
- As operações financeiras devem ser atômicas.

## 5. Organização dos testes

Proponha uma estrutura de diretórios que se encaixe na arquitetura atual.

Considere separar:

- Testes unitários dos Services.
- Testes de integração dos Repositories.
- Testes E2E dos Controllers e rotas.
- Factories e fixtures de testes.
- Configurações globais de testes.
- Configuração do banco de dados de testes.

Não crie arquivos ou pastas desnecessários.

## 6. Segurança do ambiente de testes

Essa parte é obrigatória.

- Nunca utilizar o banco de produção ou o banco principal do Supabase para testes destrutivos.
- Criar uma configuração independente para o ambiente de testes.
- Não compartilhar dados entre testes de maneira descontrolada.
- Garantir limpeza dos registros criados durante os testes.
- Evitar dependência da ordem de execução.
- Não expor segredos ou credenciais.
- Avaliar como isolar o processamento automático do Job durante os testes.

## 7. Metodologia de implementação

Quero desenvolver essa etapa de maneira organizada e incremental.

1. Analise os Services, Repositories e Controllers existentes.
2. Verifique como as dependências são instanciadas pelas factories.

**Segundo: planejamento.**

Apresente:

- Ferramentas recomendadas.
- Justificativa das escolhas.
- Estrutura proposta de testes.
- Configurações necessárias.
- Estratégia para banco de testes.
- Ordem de implementação.
- Riscos e possíveis dificuldades.

**Terceiro: implementação incremental.**

1. Configure o ambiente de testes.
2. Configure os scripts do package.json.
3. Crie o primeiro teste unitário.
4. Explique a estrutura e o funcionamento.
5. Execute o teste e verifique o resultado.
6. Avance para os próximos Services.
7. Implemente testes de integração.
8. Implemente testes E2E.

## 8. Padrões de qualidade

- Utilize TypeScript.
- Evite duplicação de código nos testes.
- Utilize mocks somente quando fizer sentido.
- Não transforme todos os testes em testes unitários com mocks.
- Prefira testar comportamentos e regras de negócio, não detalhes internos da implementação.
- Escreva nomes de testes claros e descritivos.
- Teste cenários positivos, negativos e casos extremos.
- Não altere regras de negócio apenas para fazer um teste passar.
- Não crie abstrações desnecessárias.

## 10. Resultado esperado

Ao concluir essa etapa, quero ter:

- Ambiente de testes configurado.
- Testes unitários para os Services.
- Testes de integração para os Repositories.
- Testes E2E para os endpoints.
- Banco de testes isolado.
- Scripts para execução dos testes.
- Cobertura dos principais cenários de negócio.
- Testes específicos para consistência financeira.
- Uma estrutura fácil de manter e expandir.