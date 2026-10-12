# Revisão automática de rascunhos

No ADM, selecione as matérias e use **Revisar e corrigir selecionadas**. O painel acompanha a fila e mostra as alterações realizadas ou as pendências que exigem revisão manual. No Telegram, há um botão no cartão individual e outro para revisar as matérias selecionadas.

A revisão pesquisa fontes, relê as páginas disponíveis e reescreve a mesma pauta com os fatos encontrados. Uma segunda checagem exige evidências literais nas fontes para título, resumo e seções do texto. Afirmações não comprovadas impedem que o texto gerado substitua o original. Essa verificação por IA reduz erros, mas ainda exige a avaliação do editor antes de publicar.

Imagens existentes passam por conferência visual. O seletor busca material oficial quando uma imagem é rejeitada ou está faltando. Não há substituição por descrições genéricas se a análise visual falhar. Disponibilidade, dimensões, proporção, origem e repetição também são verificadas. Se não houver três imagens adequadas, o resultado continua em revisão com o motivo.

A fila é persistida em `editorial_review_jobs`, acessível apenas pelo servidor. A API do ADM exige administrador autenticado com AAL2; o Telegram aceita o administrador no chat privado configurado. A revisão não altera slug, autoria, identidade ou estado de publicação. Os agendamentos são removidos ao iniciar a revisão, e uma edição humana, arquivamento ou publicação concorrente impede sobrescrita.

Um trabalhador processa uma matéria por vez. O painel e o webhook iniciam o processamento em segundo plano. O Cron do Supabase verifica a fila a cada cinco minutos e chama `/api/cron/editorial-review` quando há trabalho, mesmo com o painel fechado. O POST exige um token exclusivo guardado no Vault; o site verifica seu hash em uma tabela privada. O GET manual exige `CRON_SECRET`. Tarefas interrompidas podem ser retomadas uma vez; a gravação exige a versão original e um token de execução válido.

O processamento usa Gemini e o fallback editorial já configurado, com consultas e análise visual. Consome os créditos dos provedores existentes apenas quando há tarefa na fila. O agendador vazio não chama IA.

Para ativar, aplique as migrações `20261012025845_editorial_review_jobs.sql` e `20261012032541_editorial_review_dispatcher.sql` e publique o código. A segunda habilita `pg_cron` e `pg_net` e configura o agendador sem depender de crons frequentes no plano da Vercel. Cada função de revisão tem limite de 300 segundos; o trabalho individual usa orçamento menor e a fila controla a continuação do lote.
