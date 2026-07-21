"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/ui/Footer";
import { invokeFunction } from "@/lib/supabase/functions";

type InstitutionalSlug = "termos" | "privacidade" | "anuncie";

function AdvertiseSection() {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    budget: "up_to_5k",
    message: "",
    website: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await invokeFunction("submit-contact", formData);
      setSubmitted(true);
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : "Erro ao enviar proposta. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-5">
        <div className="w-12 h-12 mx-auto rounded-full border border-green-500/40 bg-green-500/10 text-green-400 flex items-center justify-center text-xl">✓</div>
        <h1 className="text-2xl font-black uppercase">Proposta enviada</h1>
        <p className="text-sm text-gray-400 font-sans">A equipe comercial recebeu sua mensagem e responderá pelo e-mail informado.</p>
        <button type="button" onClick={() => setSubmitted(false)} className="text-brand-orange hover:underline cursor-pointer">Enviar outra proposta</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-5xl font-black uppercase">Anuncie na <span className="text-brand-orange">Orange_Brick</span></h1>
        <p className="text-sm text-gray-400 font-sans leading-relaxed">Fale com a equipe sobre banners, conteúdo patrocinado identificado, reviews e integrações editoriais.</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-card-slate/30 border border-brand-orange-muted/15 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <label className="text-xs uppercase text-gray-400">Nome
            <input required minLength={2} maxLength={100} value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} className="mt-2 w-full bg-background-void border border-white/10 rounded-lg px-4 py-3 text-white normal-case font-sans" />
          </label>
          <label className="text-xs uppercase text-gray-400">Empresa
            <input required minLength={2} maxLength={120} value={formData.company} onChange={(event) => setFormData({ ...formData, company: event.target.value })} className="mt-2 w-full bg-background-void border border-white/10 rounded-lg px-4 py-3 text-white normal-case font-sans" />
          </label>
        </div>
        <label className="block text-xs uppercase text-gray-400">E-mail corporativo
          <input required type="email" maxLength={180} value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} className="mt-2 w-full bg-background-void border border-white/10 rounded-lg px-4 py-3 text-white normal-case font-sans" />
        </label>
        <label className="block text-xs uppercase text-gray-400">Orçamento estimado
          <select value={formData.budget} onChange={(event) => setFormData({ ...formData, budget: event.target.value })} className="mt-2 w-full bg-background-void border border-white/10 rounded-lg px-4 py-3 text-white normal-case font-sans">
            <option value="up_to_5k">Até R$ 5.000</option>
            <option value="5k_to_20k">R$ 5.000 a R$ 20.000</option>
            <option value="above_20k">Acima de R$ 20.000</option>
          </select>
        </label>
        <label className="block text-xs uppercase text-gray-400">Mensagem
          <textarea required minLength={20} maxLength={3000} rows={6} value={formData.message} onChange={(event) => setFormData({ ...formData, message: event.target.value })} className="mt-2 w-full bg-background-void border border-white/10 rounded-lg px-4 py-3 text-white normal-case font-sans resize-y" />
        </label>
        <label className="absolute -left-[9999px]" aria-hidden="true">Website
          <input tabIndex={-1} autoComplete="off" value={formData.website} onChange={(event) => setFormData({ ...formData, website: event.target.value })} />
        </label>
        {submitError && <p role="alert" className="text-xs text-red-400">{submitError}</p>}
        <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-brand-orange hover:bg-brand-orange/90 rounded-lg font-bold uppercase disabled:opacity-50 cursor-pointer">
          {isSubmitting ? "Enviando..." : "Solicitar proposta"}
        </button>
      </form>
    </div>
  );
}

function LawSection({ type }: { type: Exclude<InstitutionalSlug, "anuncie"> }) {
  if (type === "termos") {
    return (
      <article className="max-w-3xl mx-auto space-y-6 text-sm text-gray-300 font-sans leading-relaxed">
        <h1 className="text-3xl font-mono font-black uppercase text-white">Termos de Uso</h1>
        <p>Ao acessar o Orange Brick, você concorda com estes termos. O conteúdo é informativo e não substitui orientação técnica individual.</p>
        <h2 className="text-lg font-mono font-bold text-white uppercase">Conteúdo e propriedade intelectual</h2>
        <p>Textos, identidade visual e materiais próprios são protegidos por direitos autorais. Citações e compartilhamentos devem preservar o crédito e o link da matéria.</p>
        <h2 className="text-lg font-mono font-bold text-white uppercase">Comentários</h2>
        <p>Spam, assédio, discurso de ódio, conteúdo ilegal e violações de direitos podem ser removidos. Contas e sessões abusivas podem ser bloqueadas.</p>
        <h2 className="text-lg font-mono font-bold text-white uppercase">Responsabilidade</h2>
        <p>Buscamos precisão editorial, mas informações podem mudar. Decisões de compra, modificação de hardware ou software são responsabilidade do leitor.</p>
      </article>
    );
  }

  return (
    <article className="max-w-3xl mx-auto space-y-6 text-sm text-gray-300 font-sans leading-relaxed">
      <h1 className="text-3xl font-mono font-black uppercase text-white">Política de Privacidade</h1>
      <p>O Orange Brick trata apenas os dados necessários para funcionamento, segurança e interação no portal.</p>
      <h2 className="text-lg font-mono font-bold text-white uppercase">Dados tratados</h2>
      <p>Reações e visualizações usam identificadores técnicos pseudonimizados para reduzir duplicidade e abuso. Comentários, notificações e contatos usam os dados informados pelo usuário.</p>
      <h2 className="text-lg font-mono font-bold text-white uppercase">Finalidade e retenção</h2>
      <p>Os dados são usados para entregar recursos solicitados, proteger o serviço e produzir métricas agregadas. Registros deixam de ser mantidos quando não são mais necessários.</p>
      <h2 className="text-lg font-mono font-bold text-white uppercase">Seus direitos</h2>
      <p>Pedidos de acesso, correção ou exclusão podem ser enviados pela página de contato comercial, identificando no assunto que se trata de uma solicitação de privacidade.</p>
    </article>
  );
}

export function InstitutionalClient({ slug }: { slug: InstitutionalSlug }) {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return (
    <div className="min-h-dvh bg-background-void text-white font-mono">
      <header className="border-b border-white/10 bg-card-slate/20 py-4">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="text-xs text-gray-400 hover:text-white">← Voltar para a home</Link>
          <Link href="/" className="flex items-center gap-3">
            <Image src={`${basePath}/logos/Logo Tijolo Quebrado.PNG`} alt="Orange Brick" width={80} height={40} className="h-10 w-auto" />
            <span className="font-black uppercase">Orange<span className="text-brand-orange">_</span>Brick</span>
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-12 min-h-[65vh]">
        {slug === "anuncie" ? <AdvertiseSection /> : <LawSection type={slug} />}
      </main>
      <Footer />
    </div>
  );
}
