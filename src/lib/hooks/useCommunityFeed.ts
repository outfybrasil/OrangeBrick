"use client";

import { useState, useEffect, useCallback } from "react";
import type { CommunityPost, CommunityPoll, AttachedArticle } from "@/lib/types/community";
import type { ReactionType } from "@/lib/types/database";

const MOCK_INITIAL_POSTS: CommunityPost[] = [
  {
    id: "brick-1",
    author_name: "Gabriel 'Viper' Silva",
    author_avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
    content: "Galera, o Switch 2 manter os cartuchos físicos com o novo Game-Key Card é a melhor decisão pro mercado de colecionadores. Finalmente a Nintendo acertou!",
    platform_tag: "[SWITCH 2]",
    attached_article: {
      id: "switch-2-media",
      slug: "nintendo-switch-2-game-key-card",
      title: "Nintendo Switch 2 mantém cartuchos, mas inventa o 'Game-Key Card'",
      summary: "O Switch 2 trouxe dois tipos de mídia física: o cartucho clássico e o Game-Key Card.",
      image_url: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=600&q=80",
      category: "hardware",
    },
    reactions: { hype: 42, flop: 5, salty: 3 },
    user_reaction: null,
    comments_count: 14,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    is_pinned: true,
  },
  {
    id: "brick-2",
    author_name: "Mariana Costa",
    author_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    content: "Se a Sony realmente encerrar discos físicos em 2028 no PS6, vai ser um tiro no pé gigantesco na América Latina onde jogos usados movimentam a comunidade...",
    platform_tag: "[PS5]",
    attached_article: {
      id: "sony-midia-fisica",
      slug: "sony-anuncia-fim-definitivo-midia-fisica-2028",
      title: "Sony anuncia fim definitivo de mídias físicas no PlayStation a partir de 2028",
      summary: "A Sony confirmou que a próxima geração do PlayStation funcionará exclusivamente por downloads e nuvem.",
      image_url: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=600&q=80",
      category: "industry",
    },
    reactions: { hype: 8, flop: 38, salty: 64 },
    user_reaction: null,
    comments_count: 29,
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
];

const MOCK_POLL: CommunityPoll = {
  id: "poll-1",
  question: "Qual recurso do Switch 2 mais te empolga até agora?",
  options: [
    { id: 1, text: "Cartuchos clássicos mantidos + retrocompatibilidade", votes: 142 },
    { id: 2, text: "Novo chip gráfico DLSS customizado pela NVIDIA", votes: 98 },
    { id: 3, text: "Tela OLED de 120Hz nativa na caixa", votes: 76 },
    { id: 4, text: "Game-Key Card para instalações ultrarrápidas", votes: 34 },
  ],
  total_votes: 350,
  user_voted_option: null,
  created_at: new Date().toISOString(),
};

const LOCAL_STORAGE_KEY = "orange_brick_community_posts_v1";
const LOCAL_POLL_KEY = "orange_brick_community_poll_v1";

export function useCommunityFeed() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [poll, setPoll] = useState<CommunityPoll>(MOCK_POLL);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const savedPosts = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedPosts) {
        setPosts(JSON.parse(savedPosts));
      } else {
        setPosts(MOCK_INITIAL_POSTS);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(MOCK_INITIAL_POSTS));
      }

      const savedPoll = localStorage.getItem(LOCAL_POLL_KEY);
      if (savedPoll) {
        setPoll(JSON.parse(savedPoll));
      } else {
        localStorage.setItem(LOCAL_POLL_KEY, JSON.stringify(MOCK_POLL));
      }
    } catch {
      setPosts(MOCK_INITIAL_POSTS);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const savePosts = useCallback((newPosts: CommunityPost[]) => {
    setPosts(newPosts);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newPosts));
    } catch {}
  }, []);

  const addPost = useCallback(
    (content: string, platformTag?: string, attachedArticle?: AttachedArticle, mediaUrl?: string) => {
      const newPost: CommunityPost = {
        id: `brick-${Date.now()}`,
        author_name: "Leitor Orange Brick",
        author_avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
        content,
        platform_tag: platformTag || null,
        attached_article: attachedArticle || null,
        media_url: mediaUrl || null,
        reactions: { hype: 1, flop: 0, salty: 0 },
        user_reaction: "hype",
        comments_count: 0,
        created_at: new Date().toISOString(),
      };

      const updated = [newPost, ...posts];
      savePosts(updated);
    },
    [posts, savePosts]
  );

  const toggleReaction = useCallback(
    (postId: string, reactionType: ReactionType) => {
      const updated = posts.map((post) => {
        if (post.id !== postId) return post;

        const currentReaction = post.user_reaction;
        const newReactions = { ...post.reactions };

        if (currentReaction === reactionType) {
          newReactions[reactionType] = Math.max(0, newReactions[reactionType] - 1);
          return { ...post, user_reaction: null, reactions: newReactions };
        }

        if (currentReaction) {
          newReactions[currentReaction] = Math.max(0, newReactions[currentReaction] - 1);
        }

        newReactions[reactionType] = (newReactions[reactionType] || 0) + 1;

        return {
          ...post,
          user_reaction: reactionType,
          reactions: newReactions,
        };
      });

      savePosts(updated);
    },
    [posts, savePosts]
  );

  const votePoll = useCallback(
    (optionId: number) => {
      if (poll.user_voted_option) return;

      const newOptions = poll.options.map((opt) =>
        opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
      );

      const updatedPoll: CommunityPoll = {
        ...poll,
        options: newOptions,
        total_votes: poll.total_votes + 1,
        user_voted_option: optionId,
      };

      setPoll(updatedPoll);
      try {
        localStorage.setItem(LOCAL_POLL_KEY, JSON.stringify(updatedPoll));
      } catch {}
    },
    [poll]
  );

  return {
    posts,
    poll,
    isLoaded,
    addPost,
    toggleReaction,
    votePoll,
  };
}
