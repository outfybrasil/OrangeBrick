"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/ui/Footer";

interface InstitutionalClientProps {
  slug: string;
}

function AdvertiseSection() {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    budget: "up_to_5k",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar");

      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || "Erro ao enviar proposta. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">
      {/* Seção Hero de Mídia Kit */}
      <div className="text-center space-y-4">
        <span className="text-[10px] font-mono text-brand-orange uppercase tracking-widest border border-brand-orange/30 px-3 py-1 rounded-full bg-brand-orange/5 animate-pulse">
          Mídia Kit 2026
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-mono font-black text-white uppercase tracking-tight leading-tight">
          Anuncie na <span className="text-brand-orange">Orange_Brick</span>
        </h1>
        <p className="max-w-2xl mx-auto text-sm text-gray-400 font-sans leading-relaxed">
          Conecte sua marca com uma das comunidades de hardware, games e modding mais ativas e engajadas do país. Conheça nossos números e formatos de anúncios.
        </p>
      </div>

      {/* Cards de Métricas Neon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { metric: "+520K", label: "Visualizações Mensais", desc: "Leitores assíduos de reviews e breaking news.", border: "border-brand-orange/20 shadow-[0_0_15px_rgba(255,94,0,0.05)]" },
          { metric: "18-35", label: "Faixa Etária Principal", desc: "85% do nosso público pertence à geração de maior consumo.", border: "border-accent-blue/20 shadow-[0_0_15px_rgba(0,163,255,0.05)]" },
          { metric: "8.4%", label: "Taxa de Engajamento", desc: "Reações ácidas e debates intensos na área de comentários.", border: "border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.05)]" },
          { metric: "+180K", label: "Audiência BrickCast", desc: "Visualizações mensais em podcasts e gameplays.", border: "border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.05)]" },
        ].map((item, i) => (
          <div
            key={i}
            className={`p-6 bg-card-slate/30 border rounded-xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:bg-card-slate/50 ${item.border}`}
          >
            <span className="text-3xl font-mono font-black text-white tracking-tight">{item.metric}</span>
            <div>
              <h4 className="text-xs font-bold text-gray-300 uppercase font-mono mt-3 mb-1">{item.label}</h4>
              <p className="text-[10px] text-gray-500 font-sans leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Grid: Form e Infos de Contato */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
        {/* Formulário Comercial */}
        <div className="lg:col-span-3 bg-card-slate/20 border border-brand-orange-muted/10 rounded-2xl p-6 sm:p-8 shadow-xl relative">
          {submitted ? (
            <div className="py-12 text-center space-y-4 animate-fade-in font-mono">
              <div className="w-12 h-12 bg-green-500/10 border border-green-500/35 text-green-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                ✓
              </div>
              <h3 className="text-lg font-bold text-white uppercase">Mensagem Enviada!</h3>
              <p className="text-xs text-gray-400 font-sans max-w-sm mx-auto leading-relaxed">
                Agradecemos o interesse. Nossa equipe de parcerias comerciais entrará em contato em até 24 horas com nossa tabela de preços e formatos.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs text-brand-orange hover:underline cursor-pointer pt-4"
              >
                Enviar outra proposta
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 font-mono text-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-brand-orange-muted/10 pb-3 mb-2">
                Solicitar Proposta Comercial
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Seu Nome</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-background-void border border-brand-orange-muted/15 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-orange/40 font-sans"
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Empresa</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-background-void border border-brand-orange-muted/15 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-orange/40 font-sans"
                    placeholder="Ex: Fabricante Hardware"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">E-mail Corporativo</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-background-void border border-brand-orange-muted/15 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-orange/40 font-sans"
                  placeholder="Ex: parceiro@marca.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Orçamento Estimado</label>
                <select
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full bg-background-void border border-brand-orange-muted/15 rounded-lg px-4 py-2.5 text-gray-300 focus:outline-none focus:border-brand-orange/40 font-sans"
                >
                  <option value="up_to_5k">Até R$ 5.000</option>
                  <option value="5k_to_20k">R$ 5.000 a R$ 20.000</option>
                  <option value="above_20k">Acima de R$ 20.000</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-400 mb-1.5">Sua Mensagem / Briefing</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-background-void border border-brand-orange-muted/15 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-orange/40 font-sans leading-relaxed resize-none"
                  placeholder="Descreva sua campanha, produto ou formato desejado de parceria..."
                />
              </div>

              {submitError && (
                <p className="text-xs font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-brand-orange hover:bg-brand-orange/90 text-white font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando proposta...
                  </>
                ) : (
                  "Enviar Solicitação de Parceria"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Formatos de Anúncios */}
        <div className="lg:col-span-2 space-y-6 font-mono">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-brand-orange-muted/10 pb-3">
            Formatos Disponíveis
          </h3>
          <div className="space-y-4">
            {[
              { title: "Banners Exclusivos", desc: "Tamanhos integrados (Billboard e Half Page) em áreas de alta visibilidade da Home e páginas de posts." },
              { title: "Review Patrocinada", desc: "Análises técnicas, críticas e isentas detalhando hardwares, acessórios ou periféricos com selo de transparência." },
              { title: "Integração BrickCast", desc: "Inserções de patrocínio, menções de marca e gameplays ao vivo nos nossos podcasts e vídeos semanais." },
              { title: "Branded Content", desc: "Matérias jornalísticas ricas e focadas sobre tecnologia, modding ou softwares que agreguem valor à comunidade." },
            ].map((fmt, i) => (
              <div key={i} className="p-4 border border-brand-orange-muted/5 bg-card-slate/10 rounded-xl">
                <h4 className="text-xs font-bold text-brand-orange uppercase mb-1">{fmt.title}</h4>
                <p className="text-[10px] text-gray-400 font-sans leading-relaxed">{fmt.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LawSection({ type }: { type: "termos" | "privacidade" }) {
  if (type === "termos") {
    return (
      <div className="space-y-6 font-mono text-sm text-gray-300 leading-relaxed">
        <h1 className="text-2xl font-black uppercase text-white tracking-tight border-b border-brand-orange-muted/10 pb-3 mb-6">
          Termos de Uso do Portal
        </h1>
        <p className="font-sans">
          Bem-vindo ao **Orange Brick**. Ao acessar e utilizar este portal, você concorda em cumprir e aceitar integralmente os termos de uso aqui descritos.
        </p>

        <h2 className="text-base font-bold text-white uppercase tracking-tight mt-8">1. Propriedade Intelectual</h2>
        <p className="font-sans text-xs">
          Todo o conteúdo publicado neste site, incluindo artigos, análises, marcas, logos, imagens e layouts, são de propriedade exclusiva do Orange Brick Media Group e protegidos pelas leis nacionais e internacionais de direitos autorais. A reprodução parcial ou total de qualquer material sem consentimento prévio por escrito é expressamente proibida.
        </p>

        <h2 className="text-base font-bold text-white uppercase tracking-tight mt-8">2. Conduta nos Comentários</h2>
        <p className="font-sans text-xs">
          Nosso espaço de comentários destina-se a discussões saudáveis da comunidade de modding e games. Não toleramos comentários ofensivos, discurso de ódio, assédio, spam, propaganda não autorizada ou violação de direitos autorais de terceiros. Reservamo-nos o direito de deletar comentários e bloquear usuários infratores sem aviso prévio.
        </p>

        <h2 className="text-base font-bold text-white uppercase tracking-tight mt-8">3. Limitação de Responsabilidade</h2>
        <p className="font-sans text-xs">
          O portal envida seus melhores esforços para garantir a precisão e veracidade das análises e notícias de hardware publicadas. Contudo, o conteúdo tem fins informativos gerais e não deve ser interpretado como aconselhamento técnico de compra infalível. Não nos responsabilizamos por perdas decorrentes de decisões tomadas com base em nossas reviews.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono text-sm text-gray-300 leading-relaxed">
      <h1 className="text-2xl font-black uppercase text-white tracking-tight border-b border-brand-orange-muted/10 pb-3 mb-6">
        Política de Privacidade
      </h1>
      <p className="font-sans">
        O **Orange Brick** respeita a sua privacidade. Esta política descreve como tratamos e protegemos seus dados ao utilizar o portal.
      </p>

      <h2 className="text-base font-bold text-white uppercase tracking-tight mt-8">1. Coleta de Informações</h2>
      <p className="font-sans text-xs">
        Coletamos informações apenas quando necessário. Para visitantes comuns, coletamos de forma anônima dados de navegação e interações de reações (Hype, Flop, Salty, Defendo) para gerar métricas de leitura.
        No caso do administrador, coletamos dados de login criptografados e sessões do Supabase de forma segura.
      </p>

      <h2 className="text-base font-bold text-white uppercase tracking-tight mt-8">2. Cookies e Rastreamento</h2>
      <p className="font-sans text-xs">
        Utilizamos cookies de sessão de login para garantir o acesso ao painel administrativo. Não vendemos, alugamos ou compartilhamos dados de navegação de nossos usuários a anunciantes de terceiros.
      </p>

      <h2 className="text-base font-bold text-white uppercase tracking-tight mt-8">3. Proteção de Dados e LGPD</h2>
      <p className="font-sans text-xs">
        Adotamos práticas modernas de segurança no servidor para garantir a integridade dos dados coletados, em conformidade com as diretrizes da Lei Geral de Proteção de Dados (LGPD).
      </p>
    </div>
  );
}

export function InstitutionalClient({ slug }: InstitutionalClientProps) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const router = useRouter();
  const isValidSlug = ["anuncie", "termos", "privacidade"].includes(slug);

  if (!isValidSlug) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-background-void text-center p-4 font-mono">
        <p className="text-red-400 mb-4">Página não encontrada</p>
        <button
          onClick={() => router.push("/")}
          className="text-xs text-brand-orange hover:text-white border border-brand-orange/30 px-4 py-2 rounded-lg hover:bg-brand-orange/10 transition-colors cursor-pointer"
        >
          ← Voltar para a Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background-void text-white font-mono pb-24">
      {/* Cabeçalho de Navegação Simplificado */}
      <header className="border-b border-brand-orange-muted/10 bg-card-slate/20 py-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-xs text-gray-400 hover:text-white cursor-pointer transition-colors flex items-center gap-2"
          >
            ← Voltar para a Home
          </button>
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => router.push("/")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`} alt="Logo" className="h-10 w-auto object-contain transform group-hover:scale-[1.05] transition-transform duration-200" />
            <span className="text-sm font-mono font-black text-white uppercase tracking-wider group-hover:text-brand-orange transition-colors">
              Orange<span className="text-brand-orange">_</span>Brick
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-5xl mx-auto px-4 py-12 min-h-[60vh]">
        {slug === "anuncie" ? <AdvertiseSection /> : <LawSection type={slug as any} />}
      </main>

      {/* Footer Global Reutilizável */}
      <Footer />
    </div>
  );
}
