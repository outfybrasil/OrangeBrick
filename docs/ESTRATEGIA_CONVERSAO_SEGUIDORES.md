# Estratégia para converter vídeos em seguidores

**Atualizado em:** 25 de outubro de 2026  
**Objetivo:** aumentar seguidores do OB Labs no Instagram, TikTok e YouTube e medir quais formatos e chamadas ajudam nessa conversão.

## Diagnóstico inicial

As contagens abaixo são o retrato das contas na consulta de 25/10/2026. Não há histórico diário de seguidores suficiente para calcular crescimento ou atribuir novos seguidores a vídeos específicos.

| Plataforma | Seguidores/inscritos | Vídeos listados | Dados disponíveis |
|---|---:|---:|---|
| Instagram `ob.labs` | 13 | 27 mídias na conta | Métricas utilizáveis para 17 vídeos, com snapshots até 24/10: 1.441 visualizações, 1.309 de alcance, mediana de 68 contas alcançadas e 2,8 s de tempo médio assistido. Houve 13 curtidas, 1 compartilhamento, nenhum comentário e nenhum salvamento nesses snapshots. |
| TikTok `OB Labs` | 51 | 26 vídeos | 4.513 visualizações, mediana de 159, 133 curtidas, 1 comentário e 4 compartilhamentos na consulta. |
| YouTube `OB Labs` | 7 | 33 vídeos no canal | Foram encontrados dados atuais para 27 dos 28 vídeos públicos consultados: 4.988 visualizações, mediana de 99, 80 curtidas e 1 comentário. |

Os totais de visualizações são próprios de cada plataforma e não representam pessoas únicas entre redes. Os três vídeos do TikTok publicados em 25/10 tinham 1, 4 e 17 visualizações na consulta; são recentes demais para comparação.

### Sinais de conteúdo

- No YouTube, o vídeo sobre Shinjiro Kutaragi e o fim das mídias físicas liderava com 1.187 visualizações. Xbox Nano no Brasil e Hideo Kojima em *Cyberpunk: Edgerunners 2* tinham 545 cada; Xbox Labs e FSR 4.1 também ficaram entre os melhores.
- No TikTok, entre os destaques estavam *PEAK* com 446 visualizações, FSR 4.1 com 363, a notícia sobre a memória do Xbox Series S com 345 e *Saros: Zenith* com 247.
- No Instagram, a mediana de tempo assistido foi 2,8 s nos 17 vídeos com dados. Isso aponta para testar aberturas mais fortes e verificar a retenção desde o primeiro segundo; não identifica sozinho a causa da saída.

Esses resultados são sinais para novos testes, não prova de que um tema específico causou mais visualizações ou seguidores.

## Gargalo no convite para seguir

O roteiro atual termina com uma pergunta para estimular comentários. O convite para seguir fica nas descrições específicas de cada plataforma, e a tela final padrão diz “COMENTE ABAIXO”. Para crescer em seguidores, o próximo teste deve colocar um convite claro para seguir dentro do próprio vídeo, depois de entregar a notícia e seu impacto.

Exemplo: **“Quer entender o que muda para quem joga? Siga a OB Labs.”**

O convite deve prometer um benefício que os vídeos realmente entregam. Cada versão deve usar uma chamada principal; evite pedir para seguir, curtir, salvar e compartilhar ao mesmo tempo.

Referências no código atual:

- `src/lib/video/reel-script.ts`: roteiro pede uma pergunta final e deixa o convite para seguir na descrição.
- `src/lib/video/reel-composition.ts`: cartão final padrão de comentário.
- `src/app/admin/metricas/page.tsx`: painel de audiência e interações.
- `src/app/api/cron/reel-metrics/route.ts`: coleta social automática.

## Teste dos próximos 10 vídeos

Manter uma estrutura recorrente e comparar duas chamadas, sem publicar duplicatas do mesmo vídeo:

1. Fazer 10 vídeos no mesmo formato editorial e com duração semelhante.
2. Alternar, em pares de pautas comparáveis, cinco vídeos com o CTA atual de comentário e cinco com CTA de seguir dentro do vídeo.
3. Manter o mesmo padrão de edição, voz, legenda e posicionamento do CTA; variar apenas a chamada principal.
4. Publicar em formato nativo em cada plataforma e registrar a versão usada em cada vídeo.
5. Anotar métricas em 24 horas, 72 horas e 7 dias.

Formato editorial para testar: **“O que essa notícia muda para quem joga?”**

- **Abertura:** apresentar nos primeiros segundos o fato ou a consequência mais concreta, sem vinheta longa.
- **Desenvolvimento:** explicar o que foi confirmado, o impacto para quem joga e o que ainda não se sabe.
- **Fecho:** entregar a conclusão prometida e usar a chamada de seguir da variante designada.

Temas com impacto direto, preço no Brasil, personagens conhecidos e afirmações que geram debate podem entrar no teste, mantendo os fatos e o grau de certeza corretos.

## Métricas para acompanhar

Comparar vídeos de duração e formato semelhantes dentro de cada plataforma. Usar a mediana dos vídeos do mesmo teste, além dos totais, para reduzir o peso de um único vídeo fora da curva.

- **Retenção:** tempo médio assistido e gráfico de abandono, quando disponível.
- **Distribuição:** visualizações e alcance, separando seguidores e não seguidores quando a plataforma oferecer essa divisão.
- **Interação:** curtidas, comentários, compartilhamentos e salvamentos por alcance.
- **Conversão:** novos seguidores ou inscritos por vídeo quando houver atribuição; caso contrário, variação diária de seguidores durante o teste, comparada com alcance e publicações daquele período.
- **Site:** cliques em links com UTM e acessos às matérias vindos dos vídeos.

Fórmulas úteis quando os dados existem:

- **Interações por alcance:** `(curtidas + comentários + compartilhamentos + salvamentos) ÷ alcance`.
- **Seguidores por mil de alcance:** `novos seguidores atribuídos ÷ alcance de não seguidores × 1.000`.
- **Variação diária da conta:** `seguidores no dia atual − seguidores no dia anterior`.

Variação diária aponta coincidência temporal, não atribuição causal a um vídeo. O relatório deve marcar os casos em que a plataforma não oferece atribuição individual.

## Trabalho necessário no site

O painel `/admin/metricas` já exibe visualizações, alcance, tempo assistido, interações, seguidores quando disponíveis e cliques rastreados. Antes de usá-lo para decidir qual CTA converte melhor, corrigir a coleta e registrar os dados que identificam cada teste.

### Coletor do YouTube

O coletor solicita detalhes dos vídeos em lotes de até 50. Na consulta desta análise, a chamada com 28 IDs não trouxe os detalhes; dividindo em lotes de 5, foram encontrados 27 dos 28 vídeos. Ajustar o tamanho do lote para 5 e conferir a coleta seguinte. A consulta de Analytics para `subscribersGained` também falhou na conexão atual; investigar a resposta e permissões antes de tratar essa métrica como disponível no painel.

### Associação dos vídeos TikTok

A conta listou 26 vídeos, enquanto o banco registrava 29 publicações como concluídas. Apenas 7 dos 26 vídeos listados foram associados a registros de matéria pelos IDs atuais. Reconciliar `platform_media_id` e `external_id` com os IDs devolvidos pela listagem do TikTok; depois confirmar que os snapshots passam a guardar visualizações e interações.

### Coleta do Instagram

O banco tinha métricas utilizáveis para 17 de 30 registros e erros em outros. A consulta por vídeo para `follows` e `profile_visits` foi recusada pela API para esse tipo de mídia; não exibir esses campos como zero. A consulta de Insights da conta não retornou uma série diária na tentativa atual. O perfil fornece `followers_count`, então o coletor pode guardar diariamente essa contagem e calcular a variação da conta, deixando explícito que não atribui o seguidor a um Reel específico.

### Acompanhamento do experimento

Adicionar aos metadados do Reel campos para série editorial, tipo de gancho e variante do CTA. Mostrar essas dimensões no painel para comparar retenção, alcance e interações por variante. Guardar snapshots diários das contagens de seguidores de Instagram, TikTok e YouTube; no YouTube, manter também a tentativa de recuperar `subscribersGained` por vídeo quando a Analytics API voltar a responder.

## Links do site e limites de atribuição

O redirecionador próprio registrou zero cliques nos últimos 90 dias. Isso só cobre acessos que passam pelas rotas de rastreamento do Orange Brick; não comprova que ninguém clicou em links sem UTM ou fora do redirecionador.

Usar links diferentes por rede, por exemplo:

- `https://orangebrick.blog/reels?utm_source=instagram`
- `https://orangebrick.blog/reels?utm_source=tiktok`
- `https://orangebrick.blog/reels?utm_source=youtube`

UTM mede visitas ao site, não novos seguidores na plataforma. Para conversão em seguidores, priorizar a chamada dentro do vídeo, a clareza da bio e o histórico diário de seguidores.

## Critérios para a próxima revisão

Depois dos 10 vídeos, registrar por plataforma:

1. Mediana de visualizações, alcance e tempo assistido por variante.
2. Interações por alcance e quantidade de cliques rastreados.
3. Variação diária de seguidores no período, com as limitações de atribuição anotadas.
4. Quais pautas deram sinais de melhor retenção e compartilhamento.
5. Qual versão de CTA deve continuar, ser ajustada ou descartada.

Não aumentar volume nem investir em promoção paga até corrigir a coleta e identificar pelo menos uma combinação de pauta, abertura e CTA que apresente melhora consistente.

## Referências de plataforma

- [YouTube: espectadores novos, casuais e recorrentes](https://support.google.com/youtube/answer/10246996?hl=en-See)
- [Instagram: Best Practices para criadores](https://about.fb.com/news/2024/10/best-practices-education-hub-creators-instagram/)
- [TikTok for Business: Creative Codes](https://ads.tiktok.com/business/en-US/creative-codes) — referência de criação voltada a anúncios; gancho, desenvolvimento e chamada são uma estrutura para testar, não uma garantia de crescimento orgânico.
