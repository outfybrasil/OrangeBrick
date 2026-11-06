# Biblioteca de vídeos longos

Modo da superfície: Operate. A página `/admin/videos-longos` serve para encontrar uma produção existente, assistir, revisar e preparar a publicação.

A biblioteca mostra as versões atuais primeiro. Originais substituídos, suas variantes oficiais e prévias ficam no arquivo, sem excluir arquivos. No desktop, a seleção usa uma lista ao lado do player; em telas menores, usa um seletor antes do vídeo.

O painel do vídeo separa Assistir, Publicação, Revisão e Arquivos. Capítulos e verificações técnicas ficam recolhidos. O formulário de criação continua acessível pelo botão Nova produção.

## Comportamento dos dados

- `/api/admin/long-videos` exige sessão administrativa com MFA e carrega os vídeos independentemente das tabelas de matérias e Reels.
- A leitura combina disco, estado de execução e Storage, preservando o registro com `updated_at` mais recente e respeitando exclusões registradas.
- Downloads e reprodução são habilitados apenas para arquivos locais encontrados ou arquivos com URL assinada preparada no Storage. Atualizar renova os links.
- Antes do envio ao YouTube, título, descrição, tags e miniatura podem ser salvos no painel. A gravação verifica a versão aberta para evitar sobrescrever alterações recentes e não confirma sucesso quando o Storage falha.
- Depois do envio, esses campos ficam somente para consulta e cópia. O link de edição leva ao vídeo correto no YouTube Studio; o painel não simula alterações remotas.
- Notas podem ser atualizadas sem alterar o agendamento. Aprovação e pedido de ajustes são restritos a produções não enviadas e fora de geração.
- Uma data local não equivale a um agendamento. O rótulo Agendado no YouTube exige ID remoto, data e estado de envio `scheduled`. São registros da última confirmação, não uma consulta contínua à plataforma.
- O endpoint antigo deixou de aceitar a operação que apenas gravava uma data local e respondia como se tivesse agendado no YouTube.

## Verificação

Foram exercitados no navegador, com os vídeos reais do manifesto e autenticação/API simuladas apenas no ambiente local de teste: reprodução de MP4, seleção, busca, filtros, arquivo, edição de metadados, notas, download e recuperação de erro. Layouts conferidos em 1440, 768, 390 e 320 pixels, sem rolagem horizontal. A análise automática de acessibilidade na área principal passou em desktop e tablet.

Os testes em `tests/long-video-library.test.ts` cobrem mesclagem de registros, arquivo, horários de Brasília, distinção entre planejamento e agendamento, autenticação, conflito de edição, validação e falha de persistência. Nenhuma publicação no YouTube foi alterada para testar a interface.

## Sincronização e histórico de versões

A reconciliação de 05/11/2026 corrigiu o manifesto remoto que ainda continha apenas as produções antigas. Reedições, arquivos, miniaturas e legendas foram sincronizados; aprovações existentes e agendamentos autorizados foram preservados. A aprovação de GTA VI reeditado e da prévia v3 foi confirmada pelo usuário nessa reconciliação, com registro nessa data, sem inventar um horário anterior. Exclusões registradas continuam respeitadas.

A seção Revisão apresenta o histórico da versão e permite abrir o original ou a reedição correspondente. A aprovação pertence a cada arquivo; não é herdada pelo original. Novas alterações de revisão são acrescentadas ao histórico, sem substituir eventos anteriores.

O gerador agora chama `scripts/sync-long-videos.mjs` após concluir a produção, quando as credenciais do servidor estão configuradas. O mesmo comando pode ser executado depois de uma edição de metadados ou de uma aprovação externa ao painel. Os arquivos são enviados antes do manifesto; falhas não são reportadas como sincronização concluída. Miniaturas usam o bucket público `post-images`; MP4 e legendas permanecem no bucket privado `editorial-reels`.
