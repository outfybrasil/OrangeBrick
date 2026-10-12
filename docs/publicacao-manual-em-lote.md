# Publicação manual no ADM

A lista de matérias permite selecionar vários registros e usar **Publicar selecionadas**. O diálogo apresenta os títulos na sequência de seleção, os avisos editoriais, os bloqueios obrigatórios de imagem e a escolha entre cancelar ou **Continuar e publicar**. Matérias já publicadas são informadas e excluídas do lote, preservando suas datas.

A publicação segue a ordem de seleção; a última publicada aparece primeiro na home e no feed. Cada matéria recebe um horário de publicação distinto, calculado no banco. A criação do rascunho não determina sua posição. Após a publicação, os caches da home, notícias, artigos, RSS e sitemaps são invalidados para atualização na próxima visita. A paginação considera data de publicação e ID, inclusive empates de horário e registros antigos sem data.

O editor individual também apresenta as pendências como avisos e permite confirmar os avisos de texto e metadados. A capa e as imagens continuam obrigatórias e seguem as regras descritas em `publicacao-telegram-e-imagens.md`. Editar uma matéria já publicada preserva sua data original. Continuam obrigatórios os dados necessários para identificar e salvar o registro, como título e slug, além de uma sessão administrativa válida com dois fatores.

## Banco de dados

Aplicar `supabase/migrations/20261011234239_manual_batch_publication.sql` após a migração de segurança `20261010021625_admin_mfa_security.sql`. Essa migração ainda não foi aplicada à produção neste ambiente.

A migração cria duas funções com `security invoker`: `admin_publish_posts` e `admin_save_editorial_post`. Elas respeitam RLS e exigem usuário autenticado, permissão administrativa e AAL2. A confirmação manual permite ultrapassar as regras editoriais apenas durante a transação, mantendo as exigências obrigatórias de imagem. As publicações automáticas e as gravações diretas continuam sujeitas à validação editorial anterior.

Os lotes de até 50 matérias são atômicos. A versão `updated_at` revisada é conferida antes da publicação; se uma matéria foi alterada ou já publicada, a transação é desfeita para nova revisão. Agendamentos são removidos ao publicar manualmente. A opção de Brickboard vale para todas as matérias do lote; uma falha nessa etapa não desfaz a publicação do site e é informada ao administrador.

## Verificação

Os testes de Postgres cobrem ordem, publicação com pendências, preservação da data ao editar, remoção de agendamento, revisão desatualizada, rollback, rejeição de usuário sem MFA e manutenção do bloqueio editorial para automações. O fluxo mobile foi testado no Chromium com backend simulado, incluindo cancelamento sem gravação, publicação em lote com avisos, ordenação da home e publicação pelo editor. Não foram publicadas matérias reais durante esses testes.

A migração `20261012000650_telegram_image_publication.sql` adiciona a exigência de imagens no banco e a publicação manual pelo Telegram. Ela deve ser aplicada depois da migração de publicação em lote.
