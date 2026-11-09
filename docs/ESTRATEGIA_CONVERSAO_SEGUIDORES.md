# Estratégia para converter vídeos em seguidores

**Atualizado em:** 9 de novembro de 2026
**Objetivo:** aumentar seguidores do OB Labs no Instagram, TikTok e YouTube e medir quais formatos e chamadas ajudam nessa conversão.

## Diagnóstico inicial

As contagens e observações de implementação desta análise inicial são históricas, de 25/10. Não foram recolhidas novamente nesta revisão. O plano atualizado de YouTube, edição e voz está na seção seguinte ao documento original.

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

## Plano de YouTube, edição longa e voz — 04/11/2026

### Objetivo e público

Público inicial proposto: jogadores brasileiros interessados em consoles, jogos, mídia física e decisões da indústria que afetam preço, acesso e experiência de jogo. Validar essa hipótese no Analytics, sem assumir faixa etária ou perfil de compra.

Promessa editorial: explicar o que aconteceu, mostrar as evidências e deixar claro o que muda para quem joga. Usar o nome público configurado no canal; os documentos alternam OB Labs e Orange Brick, portanto não inventar nem trocar o nome nas peças.

O caminho de crescimento é descoberta → clique qualificado → entrega e permanência → inscrição → próximo vídeo → retorno ao canal. Curtidas e comentários ajudam a entender a reação, mas não substituem satisfação e audiência recorrente. O YouTube descreve recomendações personalizadas que combinam vários sinais; não divulga uma fórmula universal de viralização.

### Regras de trabalho

1. Escolher uma pergunta central que o vídeo consiga responder com fatos verificados. Não transformar especulação em certeza para ganhar cliques.
2. Definir título, ideia de miniatura e abertura antes da produção. Os três devem fazer a mesma promessa.
3. Mostrar o assunto e entregar uma informação útil no início. Sem vinheta ou sequência de pedidos antes da notícia.
4. Dar respostas parciais durante o desenvolvimento e entregar a resposta principal antes do encerramento. Não adiar artificialmente tudo para o fim.
5. Trocar imagens quando o argumento pedir: evidência, comparação, consequência ou nova informação. Não impor corte a cada poucos segundos.
6. Pedir uma ação por momento, depois de gerar valor, e medir se a chamada provoca abandono.
7. Conectar episódios por assunto e benefício. A próxima recomendação precisa fazer sentido para quem acabou de assistir.
8. Comparar resultados por formato, duração, idade da publicação e origem do tráfego. Não usar uma meta universal de CTR ou retenção.

### Pauta e séries

Manter três linhas reconhecíveis: “O que muda para quem joga”, para notícias explicadas; “Antes de comprar”, para dúvidas práticas com evidências; e “Por trás da indústria”, para decisões de empresas e contexto. São propostas de séries, não títulos que já existem no canal.

Para cada pauta, registrar: pergunta do público, novidade, fonte original, impacto no Brasil quando apurável, material visual disponível, relação com vídeos anteriores e validade temporal. Priorizar assuntos com pergunta clara, informação própria da apuração e materiais adequados. Não escolher apenas pelo nome de um jogo famoso.

Hipótese inicial de cadência: um vídeo longo e dois Shorts complementares por semana durante quatro semanas, mais uma publicação de comunidade quando houver acesso. Aumentar para dois longos somente se pesquisa, áudio e edição mantiverem qualidade. O horário deve partir da disponibilidade da audiência no Studio; não há um horário mágico definido neste plano.

### Títulos, miniaturas e descoberta

Preparar três propostas de título e miniatura com abordagens distintas: consequência, dúvida prática ou contraste factual. A miniatura deve identificar o assunto, funcionar em tamanho pequeno e ter texto curto apenas quando acrescentar informação. Evitar repetir o título inteiro, poluir com logos ou sugerir produto/anúncio inexistente.

Exemplo de embalagem para uma pauta explicativa sobre Game-Key Card: título “Game-Key Card: o que você realmente compra?”; miniatura com o produto correto e “PRECISA BAIXAR?”. A abertura precisa responder imediatamente à dúvida e depois explicar as condições e diferenças do formato.

Usar o teste nativo de títulos e miniaturas quando disponível. Ele permite até três variantes e avalia tempo de exibição, não apenas cliques; pode levar até duas semanas e terminar sem vencedor. Para identificar o efeito de uma mudança específica, manter os outros elementos iguais. Não interromper testes por oscilações de poucas horas.

Descrição: primeiras linhas explicam a pergunta e o benefício; em seguida vêm fontes, capítulos reais, vídeo complementar e créditos. Usar termos naturais do assunto. Tratar tags e hashtags como organização complementar, sem prometer distribuição. Playlists devem reunir perguntas relacionadas e ter uma ordem útil para o espectador.

### Estrutura dos vídeos longos

Modelo inicial para um vídeo explicativo de aproximadamente oito minutos, ajustável ao conteúdo e à retenção. Os tempos são decisões editoriais para testar, não regras do YouTube:

| Trecho | Entrega | Montagem |
|---|---|---|
| 0–10 s | Fato ou dúvida central e consequência concreta | Produto, gameplay ou documento diretamente ligado à fala |
| 10–30 s | Primeira resposta e percurso da explicação | Evidência inicial, sem lista longa de assuntos |
| 30 s–2 min | O que foi confirmado | Fonte identificada e imagens específicas |
| 2–5 min | Como funciona, comparação e limites | Exemplos visuais e diagramas quando necessários |
| 5–7 min | Impacto e dúvidas que permanecem | Consequências sustentadas pelas fontes |
| Fecho | Resposta completa e próximo assunto relevante | Encaminhamento para outro vídeo, com espaço para tela final |

Não alongar um assunto para atingir oito minutos. Cada capítulo precisa responder uma pergunta nova. Revisar o texto para retirar recapitulações redundantes, frases vazias e promessas repetidas.

### CTAs por finalidade

Não executar todas as chamadas da tabela em todo vídeo. Escolher a principal e usar as demais apenas quando contribuírem para a experiência.

| Objetivo | Momento proposto | Exemplo |
|---|---|---|
| Inscrição | Depois de uma explicação útil, em pausa natural | “Para acompanhar o que muda nos consoles e nos jogos, inscreva-se no canal.” |
| Curtida | Depois de resolver uma dúvida prática | “Se essa comparação ajudou, deixe sua curtida.” |
| Comentário | Após expor uma escolha real | “O download obrigatório muda sua decisão de comprar a edição física? Por quê?” |
| Compartilhamento | Quando existir utilidade para outra pessoa | “Envie para quem está pensando em comprar essa edição.” |
| Próximo vídeo | Depois da conclusão, integrado ao encerramento | “Para entender a diferença para um cartucho tradicional, veja esta comparação.” |

Evitar encerrar com comentário, inscrição, curtida e visita ao site na mesma frase. Quando a meta for crescimento do canal, priorizar continuidade dentro do YouTube; links do portal ficam disponíveis com contexto, sem competir com o CTA principal.

Planejar espaço visual nos últimos 5–20 segundos para os elementos da tela final, mantendo a fala útil. Inserir os elementos clicáveis no Studio: desenhar uma miniatura no MP4 não cria uma tela final interativa. Escolher um vídeo diretamente relacionado e medir a taxa de clique dos elementos.

### Shorts e distribuição

Cada longo pode gerar dois Shorts com perguntas diferentes e resposta própria. Um esclarece a dúvida mais prática; outro explica uma consequência ou equívoco. A duração segue a ideia, sem cortar a conclusão para forçar migração.

Vincular o longo usando “vídeo relacionado” no Studio, quando a conta tiver acesso aos recursos avançados. O destino precisa estar público ou não listado. Usar uma chamada específica: “A comparação completa está no vídeo relacionado”. O Short deve atrair o mesmo público do longo; alcance em assunto desconectado não comprova conversão.

Publicar primeiro o longo, depois distribuir os Shorts ao longo da semana. Usar comunidade para uma pergunta pertinente e atualizar respostas com fatos. Nas outras redes, exportar versões nativas, adaptar texto e posicionamento e usar links rastreados quando clicáveis. Não repostar várias vezes o mesmo arquivo como teste de título.

### Diagnóstico técnico da edição atual

Inspeção de código realizada em 04/11, sem avaliação auditiva dos arquivos finais:

- `scripts/generate-long-video.mjs` monta os capítulos com duas cenas e divide seu corpo em 52% e 48% do tempo. Essa proporção não garante relação entre a mudança visual e a informação falada.
- O gerador transforma placas PNG em segmentos animados. Isso oferece uma base visual, mas limita a variedade de demonstrações e cenas explicativas.
- A chamada de síntese envia `--rate=-2%`. Esse parâmetro se aplica ao caminho Edge TTS; o caminho ElevenLabs atual não o utiliza.
- `src/lib/video/reel-tts.py` usa ElevenLabs quando encontra a configuração necessária e recorre ao Edge TTS se faltar configuração ou houver falha. Isso permite mudança de timbre entre produções. Não foi confirmado qual provedor gerou os vídeos que motivaram a queixa.
- O arquivo preserva tempos por frase, mas estima os tempos de palavras por tamanho do texto, inclusive depois de receber alinhamento por caracteres do ElevenLabs. As legendas não têm comprovação de alinhamento real por palavra.

Melhoria proposta: escrever um plano de cenas por trecho da narração, com início, fim, assunto, finalidade, fonte e material. Alternar gameplay pertinente, documento legível, comparação, produto e diagrama conforme o conteúdo. Preservar a identidade editorial, reduzir placas extensas e reservar animação elaborada para momentos que ela esclareça.

Começar com um piloto de 60–90 segundos e comparar com o trecho atual antes de reconstruir um episódio completo. Verificar legibilidade no celular, vínculo imagem/fala, cortes, créditos e continuidade.

### Voz mais natural

Trabalhar em três frentes: texto falado, interpretação e acabamento. Trocar o sintetizador sozinho não resolve um roteiro com estrutura de artigo.

1. Criar uma versão falada do roteiro: frases conectadas, extensão variada, números por extenso e siglas explicadas. Manter a grafia oficial nos títulos e nas legendas; ajustar pronúncia apenas na entrada de voz ou em glossário.
2. Definir direção constante: português brasileiro, conversa jornalística, energia moderada, ênfase em fato e consequência. Evitar locução de anúncio em todas as frases.
3. Preservar contexto entre frases. Testar blocos narrativos coerentes, evitando síntese isolada de cada pequena frase; revisar emendas e consistência entre capítulos.
4. Criar uma amostra comum de 30–45 segundos com pergunta, número, nome estrangeiro e transição. Comparar duas ou três interpretações, identificadas sem revelar o provedor durante a escuta.
5. Avaliar naturalidade, pronúncia, compreensão e consistência. Escolher a voz pela amostra ouvida, não pela marca do serviço. Estimar custo antes de gerar episódios pagos completos.
6. Ajustar expressividade e estabilidade apenas dentro do suporte do modelo escolhido. Não aplicar valores aleatórios, mudar pitch por frase ou acelerar artificialmente para preencher a duração.
7. Tornar a troca de provedor explícita. Se a voz escolhida falhar, marcar a produção para revisão em vez de aprovar automaticamente uma voz diferente.
8. Corrigir trechos problemáticos com contexto suficiente e refazer sua sincronização. Usar tempos reais do provedor ou alinhamento forçado, sem distribuir palavras apenas por número de caracteres.

No acabamento, corrigir volume desigual e sibilância quando presentes, manter a trilha abaixo da fala e revisar cliques nas emendas. Referência interna de entrega: aproximadamente −14 LUFS integrados e pico verdadeiro até −1,5 dBTP após codificação; são alvos de produção, não fatores garantidos de recomendação. Medir o MP4 final e ouvir em fones e alto-falante de celular. Não remover todas as respirações ou pausas expressivas.

### Medição e decisões

Antes de estabelecer metas numéricas, recolher uma linha de base dos últimos vídeos comparáveis. Os números históricos acima não fornecem retenção e conversão suficientes para essa análise. Não foi acessado o Analytics privado nesta revisão.

| Etapa | Métrica | Ação quando houver sinal consistente |
|---|---|---|
| Clique | Impressões e CTR por origem de tráfego | Testar embalagem se o CTR estiver baixo frente a vídeos comparáveis |
| Abertura | Percentual ainda assistindo aos 30 s | Revisar promessa, primeira resposta e introdução |
| Permanência | Duração média, percentual médio e curva | Examinar quedas e trechos arrastados; picos também podem indicar dúvida ou repetição |
| Inscrição | Inscritos ganhos atribuídos por mil visualizações | Comparar benefício prometido, série e CTA |
| Reação | Curtidas, comentários e compartilhamentos por mil visualizações | Identificar utilidade e perguntas que geram respostas relevantes |
| Continuidade | Taxa de clique da tela final e audiência recorrente | Melhorar relação entre episódios e recomendação final |
| Shorts | Engajamento inicial, retenção e inscritos atribuídos | Comparar Shorts entre si e verificar tráfego encaminhado ao longo quando disponível |

CTR pode cair quando um vídeo alcança público mais amplo; interpretar junto com impressões, tráfego e tempo assistido. Não tratar baixa impressão sozinha como prova de miniatura ruim. Não comparar visualizações brutas de Shorts e longos como medidas equivalentes de interesse.

Registrar snapshots em 24 horas, 72 horas, sete e 28 dias. Usar inscritos ganhos por vídeo quando disponível e separar saldo líquido de ganhos brutos. Campos indisponíveis devem aparecer como indisponíveis, não zero. Tratar quatro semanas como piloto: volume pequeno não autoriza conclusões causais.

### Execução em 30 dias

| Período | Entrega | Critério de revisão |
|---|---|---|
| Semana 1 | Linha de base, mapa de séries, amostras de voz e piloto de edição | Escolher voz ouvida e validar leitura, pronúncia e vínculo visual |
| Semana 2 | Primeiro longo revisado, dois Shorts e embalagem em teste | Conferir abertura e primeira curva disponível; registrar problemas |
| Semana 3 | Segundo e terceiro longos conforme capacidade; manter padrão aprovado | Testar uma variável editorial por vez; não misturar voz, CTA e abertura no mesmo experimento |
| Semana 4 | Próximo episódio e relatório com resultados e limitações | Decidir o que manter e qual hipótese testar no mês seguinte |

A correção inicial de qualidade pode mudar voz e edição juntas para produzir um piloto aceitável; nesse caso, não atribuir eventual ganho a uma mudança isolada. Depois da aprovação, estabilizar a produção para testar hipóteses com menos confundidores.

### Ordem de implementação proposta

1. Roteiro falado, direção de voz, identificação do provedor e aprovação da amostra.
2. Plano de cenas ligado à fala, substituindo a divisão fixa do capítulo.
3. Tempos reais de legenda, revisão audiovisual e medição do áudio final.
4. Pacote por episódio: títulos, miniaturas propostas, descrição, capítulos, fontes, comentário fixado, tela final e Shorts relacionados.
5. Registro de variantes e métricas no painel, respeitando disponibilidade e permissões.

Planejamento aprovado pelo usuário em 04/11/2026 como novo padrão. A implementação seguinte aplica CTA de seguir como padrão nos curtos, roteiro falado e planejamento de cenas nos longos, retirada de pausas para atingir duração, identificação de voz sem troca automática após falha e revisão explícita das validações. A prévia de Game-Key Card está em `public/long-videos/game-key-card-novo-padrao-preview/`. A naturalidade da voz continua dependendo da escuta; não houve publicação em redes.

Para reproduzir: `npm run video:long -- --episode=public/long-videos/game-key-card-novo-padrao-preview/episode.json --preview`. A prévia usa Thalita Multilingual via Edge TTS, em velocidade normal, pois ElevenLabs não está configurado neste ambiente. Os tempos por palavra dessa voz são estimados por frase; não afirmar sincronização real por palavra. O MP4 final é decodificado e medido em LUFS/pico verdadeiro, com correção de áudio quando necessária. Telas finais, vídeo relacionado, testes de embalagem e métricas no Studio ainda dependem da configuração e dos dados da plataforma.

### Refinamento aprovado após a primeira prévia

Após assistir à prévia revisada, o usuário confirmou sua adoção como padrão das próximas produções. Referência aprovada: `youtube-editorial-v3`, em `public/long-videos/game-key-card-edicao-fluida-v3-preview/`. Manter a direção de edição e áudio, criando uma progressão visual específica para cada pauta.

A versão anterior, com movimento do quadro e listas repetidas, foi substituída pelo padrão `youtube-editorial-v3`: câmera fixa, animações de elementos e variedade de composição sustentada pelo assunto. Não aplicar um corte ou efeito só para cumprir um intervalo. A mudança precisa acompanhar uma nova informação, uma prova ou uma consequência.

Na prévia revisada de Game-Key Card, a progressão é: produto → aviso real da embalagem → caminho dos dados → armazenamento → inserção do cartão → condições para jogar sem conexão → outro console → novo download nesse aparelho → informação sobre conta Nintendo → decisão na loja → CTA. A informação sobre conta é entregue mais adiante porque acrescenta uma dúvida diferente, sem atrasar a resposta principal dada na abertura.

Arquivo e roteiro reproduzível: `public/long-videos/game-key-card-edicao-fluida-v3-preview/`. O render usa composições HTML/SVG e GSAP, sem zoom ou deslocamento do quadro. A marca e a área de leitura permanecem estáveis. A rotação automática considera Thalita Multilingual e Francisca, evita a mesma voz consecutiva quando possível e preserva a escolha durante novas tentativas do mesmo episódio. A qualidade de voz continua sujeita à escuta. Uma voz explicitamente escolhida tem prioridade; o provedor configurado mantém suas próprias credenciais e voz.

O aumento de variedade é uma hipótese editorial de retenção, não um resultado de audiência já medido. Comparar a curva, sobretudo após a abertura e nas transições, quando o vídeo tiver dados suficientes no Studio. [Orientação oficial do YouTube](https://support.google.com/youtube/answer/9314415?hl=pt-BR).

### Fontes oficiais

- [Sistema de recomendações e satisfação — YouTube](https://blog.youtube/inside-youtube/on-youtubes-recommendation-system/) — explicação de base publicada em 2021; não representa uma fórmula nova de 2026.
- [Momentos importantes da retenção — YouTube Help](https://support.google.com/youtube/answer/9314415?hl=en).
- [Teste A/B de títulos e miniaturas — YouTube Help](https://support.google.com/youtube/answer/16391400).
- [Telas finais — YouTube Help](https://support.google.com/youtube/answer/6388789).
- [Vídeo relacionado em Shorts — YouTube Help](https://support.google.com/youtube/answer/14075157?hl=en).


## Aplicação nos geradores e plano orgânico — aprovado em 09/11/2026

O usuário autorizou aplicar as conclusões aos próximos vídeos longos e Reels. O planejamento a seguir substitui o teste anterior de CTA como primeiro experimento: primeiro padronizar a chamada e comparar aberturas; depois testar outras variáveis. O padrão visual aprovado continua sendo `youtube-editorial-v3`.

### Implementação

- `src/lib/video/reel-script.ts`: geração e revisão pedem alinhamento entre título, primeira fala e prova visual; consequência ou curiosidade demonstrável antes de calendário e números corporativos. A normalização remove convites repetidos e usa uma única chamada ao OB Labs. A escolha explícita de CTA de comentário continua disponível.
- `scripts/generate-reel.mjs`: `production.json` registra `audiencePlan`, com promessa, objetivo de audiência recorrente, revisão em 24/72/168 horas e itens que exigem revisão editorial.
- `scripts/generate-long-video.mjs`: roteiro e planejamento visual receberam as mesmas regras de promessa e prova. O preparo do episódio preserva um CTA ao OB Labs mesmo quando executado novamente, e o manifesto registra o plano de audiência. O nome da marca gráfica permanece Orange Brick.
- A geração de metadados de revisão não comprova, automaticamente, a adequação da imagem, a retenção, a pronúncia ou a execução do acompanhamento. São requisitos para verificar em cada produção. Não foi criado um agendador de experimentos ou snapshots por idade nesta etapa.

### Plano de crescimento orgânico: ciclo inicial de quatro semanas

**Público inicial:** jogadores brasileiros que querem decidir o que comprar, como preparar o console e o que uma mudança de plataforma afeta em sua biblioteca. Reduzir a dispersão editorial durante o teste, mantendo notícias de outros temas quando houver uma consequência clara para esse público.

**Promessa recorrente:** “OB Labs, o canal do Orange Brick que explica o que muda para quem joga.” Antes de fazer mudanças públicas, preparar bio, banner e organização coerentes com essa promessa. Não misturar uma promessa principal de gameplays completas com uma programação principal de notícias. A mudança pública de descrição e identidade ainda não foi executada.

**Séries propostas:**

| Série | Pergunta do espectador | Papel no crescimento |
|---|---|---|
| Antes de comprar | O que vem, o que custa e qual limitação preciso conhecer? | Busca e utilidade persistente |
| Mudou no meu console | O que funciona hoje, para quem e com quais requisitos? | Recorrência e confiança |
| Por dentro dos games | Como funciona este produto ou decisão incomum? | Descoberta com prova visual |

A série é uma promessa reconhecível, não uma vinheta longa. Cada episódio deve funcionar sozinho. Não transformar notícia antiga em novidade para preencher calendário.

**Cadência de teste:** um longo e três Shorts por semana, durante quatro semanas: quatro longos e doze curtos. É uma hipótese de organização e capacidade, não um horário ou volume comprovadamente favorecido pelo algoritmo. Não interromper ou alterar agendamentos existentes automaticamente. Ajustar essa cadência à apuração e aos materiais oficiais disponíveis, sem preencher vagas com assuntos fracos.

Cada longo terá uma pergunta central. Dois Shorts ligados a ele devem entregar respostas próprias sobre aspectos diferentes; o terceiro pode cobrir uma curiosidade visual pertinente ao público. Evitar recortar o longo como teaser que esconde a resposta. Publicar em dias distintos facilita observar cada entrega, mas não comprova penalidade por publicações próximas.

**Semana 1 — coerência e primeira medição:** revisar promessa do canal e organizar as três séries; escolher um assunto útil com demanda de busca verificável; preparar roteiro, título, miniatura e primeira prova em conjunto; registrar o primeiro par de aberturas e o baseline das métricas disponíveis. Não propor temas como confirmados sem apuração atual.

**Semana 2 — busca e continuidade:** publicar uma explicação complementar ao primeiro longo; associar os Shorts ao vídeo correto pela função de vídeo relacionado; configurar tela final do longo para o próximo assunto pertinente e organizar a playlist. Essas configurações precisam ser confirmadas no Studio: links desenhados no arquivo não são interativos.

**Semana 3 — aprofundar a pergunta que gerou interesse:** usar consultas de busca e dúvidas reais dos comentários para escolher a próxima pauta; responder aos comentários recebidos com informação útil, sem mensagens automáticas genéricas. Revisar os primeiros 30 segundos do longo e a queda inicial dos curtos. Não interpretar um pico ou uma inscrição isolada como tendência.

**Semana 4 — avaliação:** comparar os seis pares de Shorts nas mesmas idades; comparar os longos com janela já consolidada, deixando os recém-publicados como preliminares; manter os ângulos que repetirem bons sinais e revisar os demais. Se o tráfego crescer sem inscrições ou retorno, revisar a promessa de continuidade e o CTA antes de aumentar volume.

### Distribuição e descoberta de cada publicação

1. **Busca:** títulos com jogo/produto e pergunta concreta, em português natural; descrição inicial que responde à mesma promessa; capítulos para navegar pela explicação. Priorizar termos confirmados pela pesquisa e pelo relatório de consultas quando disponível, sem acumular palavras-chave ou hashtags genéricas.
2. **Recomendação interna:** indicar um próximo vídeo realmente relacionado, com tela final e playlist verificadas. Priorizar continuidade temática, não enviar todos os vídeos para um link genérico do site.
3. **Shorts:** responder a uma pergunta completa e configurar o longo relacionado quando houver complementaridade. Usar o convite para acompanhar após o valor entregue, sem repetir a chamada nem pedir várias ações.
4. **Orange Brick:** incorporar o longo na matéria correspondente ou em uma seção contextual, quando editorialmente pertinente. O link e o texto devem explicar o benefício de assistir, sem criar tráfego artificial. Essa implantação no site não foi executada nesta etapa.
5. **Instagram e TikTok:** usar versões nativas e independentes da mesma pauta. Não prometer conversão dessas redes para YouTube; medir acessos rastreados separadamente. Uma rede não deve servir apenas como anúncio vazio da outra.
6. **Comunidades:** somente compartilhar onde o assunto é útil e as regras permitem, com contexto próprio, quando houver autorização para publicar naquele espaço. Nenhum disparo ou mensagem a terceiros faz parte desta implementação.

### Medição e decisões

Registrar em 24 h, 72 h e sete dias: data real da consulta, período efetivamente processado, formato, série, gancho, CTA, título/miniatura usados, views, visualizações engajadas, média assistida, curva, compartilhamentos e inscrições atribuídas. CTR, impressões, escolha no feed e retorno devem ser exportados do Studio enquanto não forem acessíveis pela integração. Um dado ainda não processado permanece pendente.

Indicadores principais: retenção inicial e média assistida dentro do mesmo formato; inscrições atribuídas por mil views com numerador e denominador do mesmo relatório; espectadores recorrentes; continuidade para outro vídeo. Mostrar sempre contagens absolutas junto das taxas, pois o canal ainda tem amostra pequena. Meta inicial é obter melhora repetida frente à própria linha de base, não prometer determinada quantidade de inscritos em 30 dias.

Se houver pouca exposição com boa permanência, testar título/miniatura e demanda do assunto. Se houver cliques/exibição e queda inicial, revisar correspondência entre promessa e abertura. Se houver permanência sem inscrições ou retorno, revisar benefício recorrente e continuidade. Sem impressões/CTR, não atribuir automaticamente baixo alcance à miniatura. Continuar a estratégia orgânica; não contratar tráfego ou aumentar produção para mascarar uma entrega fraca.
