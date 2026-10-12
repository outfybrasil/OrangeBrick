# Publicação manual pelo Telegram e imagens obrigatórias

O Telegram passa a ter o mesmo fluxo de confirmação do ADM. Na lista de rascunhos, **Selecionar** adiciona ou remove uma matéria do lote, preservando a ordem dos cliques. **Publicar selecionadas** abre a revisão; **Continuar e publicar** confirma os avisos editoriais. **Cancelar** mantém os rascunhos. A última publicada aparece primeiro no site.

A capa e pelo menos duas imagens internas distintas são obrigatórias no ADM e no Telegram. A verificação aplica os filtros editoriais existentes para origem oficial/confiável, relação da capa com o assunto, imagens genéricas e miniaturas. Confere HTTP 200, arquivo suportado, dimensão mínima de 1200 × 675 e formato final 16:9, textos alternativos e legendas específicos com pelo menos 20 caracteres, e duplicação por URL/hash dentro da notícia, do lote e em até 500 notícias publicadas nos últimos 14 dias. A biblioteca editorial informa a origem de imagens hospedadas no Storage. Uma origem desconhecida precisa ser corrigida antes da publicação; falhas de rede também impedem confirmar a integridade das imagens.

O uploader rejeita originais abaixo da resolução mínima, evitando que uma miniatura ampliada passe como imagem de alta resolução. A revisão visual automática do seletor exige material autêntico, correspondência com o assunto e confiança de pelo menos 0,9; descrições curtas não recebem complementos inventados. A relação visual também continua dependendo da escolha editorial correta e da revisão dos pixels no fluxo de geração; URL, dimensões e descrições sozinhas não provam toda a cena retratada.

As pendências de extensão do texto, resumo, citações e fontes do texto permanecem como avisos confirmáveis. Os blocos precisam permitir que as imagens sejam exibidas pelo site. Permissões, sessão válida e falhas técnicas continuam sendo tratadas pelo sistema.

## Confirmações e banco

Aplicar `supabase/migrations/20261012000650_telegram_image_publication.sql` após as migrações de MFA e publicação manual em lote. A nova migração ainda não foi aplicada à produção neste ambiente.

O Telegram registra uma revisão privada com administrador, versões das matérias, imagens verificadas e validade de dez minutos. A confirmação exige o mesmo administrador no chat autorizado, verifica as imagens novamente e publica o lote atomicamente pelo servidor. Confirmações repetidas não mudam as datas; confirmações canceladas, expiradas ou desatualizadas não publicam. As funções de seleção e publicação do bot são exclusivas de `service_role`; leitores e clientes autenticados comuns não podem executá-las. As regras completas das publicações automáticas continuam ativas.

O banco exige capa e duas imagens em blocos válidos mesmo quando o administrador confirma os demais avisos. A confirmação manual do Telegram usa uma exceção editorial limitada à transação, sem remover as regras de imagem. A verificação técnica de arquivos e origem ocorre no servidor antes dessa transação. O webhook invalida os caches públicos após publicar.

Os testes usam Postgres local e API do Telegram simulada. Nenhuma matéria real foi publicada nem mensagem foi enviada para um chat real durante a validação. A ativação depende da publicação do código, aplicação das migrações e teste no ambiente conectado ao Supabase/Telegram.
