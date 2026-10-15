export type RelatedArticle = { id: string; slug: string; title: string; summary: string; topic_id?: string | null; published_at: string | null };
const ignored = new Set("a o as os de da do das dos em no na nos nas um uma uns umas e ou que com por para pelo pela sobre entre apos antes mais menos novo nova novos novas jogo jogos game games trailer lancamento revela anuncia ganha chega recebe detalhes oficial primeira primeiro video veja como sera pode vai seu sua seus suas the and of for with from into this that has new".split(" "));

function words(text: string): Set<string> {
  return new Set(text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\bgta\b/g, "grand theft auto").split(/[^a-z0-9]+/).filter(word => word.length >= 3 && !ignored.has(word) && !/^\d+$/.test(word)));
}

export function relatedArticles<T extends RelatedArticle>(current: RelatedArticle, candidates: T[], limit = 4): T[] {
  const title = words(current.title);
  const context = words(`${current.title} ${current.summary}`);
  const seen = new Set([current.id]);
  return candidates.flatMap(post => {
    if (seen.has(post.id) || post.slug === current.slug) return [];
    seen.add(post.id);
    const sharedTopic = Boolean(current.topic_id && current.topic_id === post.topic_id);
    const otherTitle = words(post.title);
    const sharedTitle = [...title].filter(word => otherTitle.has(word));
    const sharedContext = [...words(`${post.title} ${post.summary}`)].filter(word => context.has(word));
    const specificTitle = sharedTitle.some(word => word.length >= 5);
    if (!sharedTopic && sharedTitle.length < 2 && !specificTitle) return [];
    const score = (sharedTopic ? 100 : 0) + sharedTitle.length * 6 + sharedContext.length;
    return [{ post, score }];
  }).sort((a, b) => b.score - a.score || (Date.parse(b.post.published_at || "") || 0) - (Date.parse(a.post.published_at || "") || 0) || a.post.id.localeCompare(b.post.id)).slice(0, Math.max(0, limit)).map(item => item.post);
}

export type SearchSuggestion = { id: string; label: string; href: string; kind: "Notícia" | "Jogo" | "Plataforma" };
