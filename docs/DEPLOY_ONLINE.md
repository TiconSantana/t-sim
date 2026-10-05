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

O T-Sim está conectado ao projeto Supabase **Tconnect** (`vyrxopbrgpndzfayflve`), na região `sa-east-1`, reutilizando a tabela protegida `public.cenario_simulador` e a função de vínculo do usuário já existente na plataforma. O plano gratuito é adequado para validação e uso inicial, sem contratação de serviço pago.

## Limite atual

O endereço público já está publicado em `https://t-sim.vercel.app`. O primeiro acesso ainda pode operar no fallback local. Depois de entrar com um usuário Tconnect no painel **Configurações → Sincronização online**, o T-Sim salva e recupera o workspace no Supabase. Se a conta autenticada ainda não possuir um vínculo em `public.colaborador`, o app informa essa condição e continua no modo local.

## Ordem de ativação

1. Repositório criado em `https://github.com/TiconSantana/t-sim`.
2. Projeto Vercel `t-sim` criado com deploy automático a partir da branch `main`.
3. Variáveis públicas do Supabase configuradas na Vercel para Production.
4. Persistência cloud usando `public.cenario_simulador` com RLS existente.
5. Falta apenas autenticar um usuário Tconnect e confirmar que ele possui vínculo em `public.colaborador`.
6. Depois disso, validar login, isolamento por empresa, sincronização e recuperação de backup.
7. Se desejado, conectar domínio próprio.

## Decisão necessária para a próxima etapa

Escolha uma opção para eu concluir a publicação:

1. **Vercel + Supabase (recomendado):** gratuito para começar e cobre hospedagem, login e sincronização multiaparelho.
2. **Cloudflare Pages + D1:** gratuito para começar, porém exige mais configuração técnica.
3. **Somente Vercel:** publica o app agora, mas mantém os dados separados por navegador até conectar um banco.

Nenhuma opção exige contratação paga. A disponibilidade e os limites dependem dos planos gratuitos vigentes e das contas do proprietário.
