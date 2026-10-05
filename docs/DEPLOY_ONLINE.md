# T-Sim online sem custo de licença

## O que já está pronto

- O app funciona como aplicação web responsiva em desktop, tablet e celular.
- O build gera uma PWA instalável pelo navegador.
- O `vercel.json` mantém as rotas do React funcionando quando o usuário abre uma tela diretamente.
- Um service worker mantém a casca do aplicativo disponível quando a rede oscila.
- O workspace local continua preservado em `localStorage`, com backup e restauração em JSON.

## Caminho recomendado

### 1. Hospedagem gratuita: Vercel Hobby

Publicar o conteúdo estático do T-Sim no plano gratuito da Vercel. É suficiente para o MVP e não exige servidor próprio.

O projeto precisa ser conectado a uma conta do responsável. O login, a escolha do projeto e o domínio são ações do proprietário da conta e não podem ser concluídos automaticamente nesta máquina sem autorização e credenciais.

### 2. Dados compartilhados: Supabase Free

Para que as simulações sejam acessíveis em mais de um aparelho, o armazenamento precisa sair do navegador e ir para uma base online. A próxima camada deve usar:

- autenticação por e-mail;
- organização/empresa e membros;
- cargos, premissas, operações, cenários e pareceres;
- Row Level Security para separar empresas;
- trilha de auditoria e versões dos cenários;
- sincronização com fallback local quando estiver sem conexão.

O plano gratuito é adequado para validação e uso inicial, sem contratação de serviço pago.

## Limite atual

Enquanto a conta cloud não for conectada, cada navegador terá seu próprio workspace local. O PWA melhora instalação e disponibilidade, mas não sincroniza dados entre aparelhos sozinho.

## Ordem de ativação

1. Criar ou selecionar a conta gratuita de hospedagem.
2. Publicar este repositório como projeto web.
3. Criar o projeto gratuito de banco/autenticação.
4. Aplicar as tabelas, políticas de acesso e migrações do T-Sim.
5. Migrar o storage local para a camada cloud com fila offline.
6. Validar login, isolamento por empresa, sincronização e recuperação de backup.
7. Publicar o endereço definitivo e, se desejado, conectar domínio próprio.

## Decisão necessária para a próxima etapa

Escolha uma opção para eu concluir a publicação:

1. **Vercel + Supabase (recomendado):** gratuito para começar e cobre hospedagem, login e sincronização multiaparelho.
2. **Cloudflare Pages + D1:** gratuito para começar, porém exige mais configuração técnica.
3. **Somente Vercel:** publica o app agora, mas mantém os dados separados por navegador até conectar um banco.

Nenhuma opção exige contratação paga. A disponibilidade e os limites dependem dos planos gratuitos vigentes e das contas do proprietário.
