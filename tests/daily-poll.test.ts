import assert from "node:assert/strict";
import test from "node:test";
import { brazilDate, createDailyPollDraft, fallbackDailyPoll, pollSimilarity, validateDailyPollDraft, type DailyPollArticle } from "../src/lib/daily-poll.ts";

const articles: DailyPollArticle[] = [{ id: "post-1", title: "Warner prioriza Hogwarts Legacy 2", summary: "A sequência está em desenvolvimento.", category: "industry", slug: "hogwarts-legacy-2", publishedAt: "2026-08-12T12:00:00Z" }];

test("calcula a data editorial no fuso de São Paulo", () => {
  assert.equal(brazilDate(new Date("2026-08-13T01:30:00Z")), "2026-08-12");
});

test("aceita uma pergunta vinculada a uma matéria fornecida", () => {
  const draft = validateDailyPollDraft({ question: "O que Hogwarts Legacy 2 mais precisa aprofundar?", options: ["Vida escolar", "Escolhas", "Exploração"], sourcePostId: "post-1" }, articles, []);
  assert.equal(draft.options.length, 3);
});

test("rejeita matéria inexistente e pergunta repetida", () => {
  assert.throws(() => validateDailyPollDraft({ question: "O que Hogwarts Legacy 2 mais precisa aprofundar?", options: ["Vida escolar", "Escolhas", "Exploração"], sourcePostId: "post-2" }, articles, []));
  assert.throws(() => validateDailyPollDraft({ question: "O que Hogwarts Legacy 2 mais precisa aprofundar?", options: ["Vida escolar", "Escolhas", "Exploração"], sourcePostId: "post-1" }, articles, ["O que Hogwarts Legacy 2 mais precisa aprofundar?"]));
});

test("detecta perguntas semanticamente próximas", () => {
  assert.ok(pollSimilarity("O que Hogwarts Legacy 2 precisa melhorar?", "O que Hogwarts Legacy 2 mais precisa melhorar?") >= 0.6);
});

test("rejeita termos editoriais em inglês sem tradução", () => {
  assert.throws(() => validateDailyPollDraft({ question: "O que Hogwarts Legacy 2 mais precisa aprofundar?", options: ["Maior budget", "Escolhas", "Exploração"], sourcePostId: "post-1" }, articles, []));
});

test("rejeita pergunta genérica mesmo com o título e alternativas abstratas", () => {
  assert.throws(() => validateDailyPollDraft({ question: "Qual é o impacto mais importante de Hogwarts Legacy 2 para a indústria de jogos?", options: ["Estratégia das empresas", "Experiência dos jogadores", "Futuro da franquia"], sourcePostId:"post-1" },articles,[]), /genérica/);
  assert.throws(() => validateDailyPollDraft({ question: "Hogwarts Legacy 2 muda sua decisão de jogar?", options:["Sim","Não","Talvez"],sourcePostId:"post-1" },articles,[]),/genéricas/);
  assert.throws(() => validateDailyPollDraft({ question:"Você pretende jogar Resident Evil quando sair?",options:["Vou esperar análises","Quero jogar no lançamento","Não pretendo jogar"],sourcePostId:"post-1" },articles,[]),/não identifica/);
});


test("fallback cria decisões específicas para preço, adiamento, trailer e versão", () => {
  const titles = ["Game Pass anuncia aumento de preço", "GTA VI é adiado para novembro", "GTA VI ganha novo trailer", "Resident Evil chega ao Nintendo Switch 2"];
  for (const title of titles) {
    const article = {...articles[0],title,summary:title};
    const draft = fallbackDailyPoll(article,[]);
    assert.deepEqual(validateDailyPollDraft(draft,[article],[]),draft);
    assert.ok(draft.question.includes(title));
    assert.ok(draft.options.every(option=>option.length>10));
  }
  const equipment={...articles[0],title:"Nintendo anuncia novo console Switch",category:"hardware"};
  assert.ok(fallbackDailyPoll(equipment,[]).options.some(option=>option.includes("equipamento")));
});

test("uma pergunta genérica provoca nova tentativa com o motivo da rejeição", async () => {
  const feedbacks: Array<string|null>=[];
  const result=await createDailyPollDraft(articles,[],async feedback=>{
    feedbacks.push(feedback);
    return {question:feedback?"Hogwarts Legacy 2 muda seus planos de jogar a sequência?":"Qual é o impacto de Hogwarts Legacy 2 para a indústria?",options:["Quero jogar a sequência no lançamento","Vou esperar avaliações de quem jogou","Prefiro continuar no jogo original"],sourcePostId:"post-1"};
  });
  assert.equal(feedbacks.length,2);
  assert.match(feedbacks[1]!,/genérica/);
  assert.equal(result.usedFallback,false);
});

test("falha da IA escolhe outra notícia adequada e nunca publica fallback genérico", async () => {
  const trailer={...articles[0],id:"trailer",title:"GTA VI revela novo trailer",summary:"Rockstar apresenta Jason e Lucia."};
  const result=await createDailyPollDraft([...articles,trailer],[],async()=>{throw new Error("Indisponível");});
  assert.equal(result.usedFallback,true);
  assert.equal(result.draft.sourcePostId,"trailer");
  assert.ok(result.draft.options.includes("Vou assistir ao vídeo completo"));
  await assert.rejects(createDailyPollDraft(articles,[],async()=>{throw new Error("Indisponível");}),/Nenhuma pergunta genérica foi publicada/);
});
