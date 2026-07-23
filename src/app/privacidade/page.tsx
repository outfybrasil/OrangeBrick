import type { Metadata } from "next";
import { PrivacyControls } from "@/components/ui/PrivacyControls";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o Orange Brick coleta, utiliza, compartilha e protege dados pessoais.",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-dvh bg-background-void px-3 py-8 text-white sm:px-4 sm:py-12">
      <article className="mx-auto max-w-3xl font-body text-sm leading-7 text-[#c3c5cc]">
        <header className="border-b border-white/10 pb-8">
          <p className="text-sm font-bold text-brand-orange">Privacidade no Orange Brick</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Política de Privacidade</h1>
          <p className="mt-3 text-xs text-[#8f919a]">Última atualização: 23 de julho de 2026</p>
        </header>

        <PrivacyControls />

        <section>
          <h2 className="mb-3 mt-10 text-xl font-bold text-white">1. Sobre esta política</h2>
          <p>
            O Orange Brick é um portal editorial sobre games com recursos de comunidade. Esta política
            descreve o tratamento de dados no site e deve ser lida junto aos Termos de Uso. O canal de
            privacidade e atendimento é{" "}
            <a href="mailto:orangebrick0@gmail.com" className="text-brand-orange underline underline-offset-4">
              orangebrick0@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-10 text-xl font-bold text-white">2. Dados tratados</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="text-white">Conta Google:</strong> identificador da conta, nome, e-mail e foto informados pelo Google.</li>
            <li><strong className="text-white">Perfil e comunidade:</strong> apelido, avatar, biografia, publicações, comentários, votos, curtidas e reações.</li>
            <li><strong className="text-white">Contato comercial:</strong> nome, empresa, e-mail, faixa de orçamento e mensagem enviados voluntariamente.</li>
            <li><strong className="text-white">Segurança:</strong> registros técnicos, agente do navegador e hash de IP usado para limitar abuso. O hash reduz a exposição do IP, mas continua sendo tratado como dado pessoal quando puder ser relacionado a uma pessoa.</li>
            <li><strong className="text-white">Métricas opcionais:</strong> com sua permissão, um identificador aleatório do dispositivo reconhece reações e leituras. Ele não contém nome ou e-mail.</li>
            <li><strong className="text-white">Notificações push:</strong> endereço técnico da assinatura e chaves fornecidas pelo navegador quando você ativa o recurso.</li>
          </ul>
          <p className="mt-4">
            Apelido, avatar, biografia e conteúdo publicado no Brickboard são visíveis publicamente.
            Não publique telefone, endereço, documentos, senhas ou outros dados sensíveis.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-10 text-xl font-bold text-white">3. Finalidades e bases legais</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Executar os recursos solicitados, como autenticação, perfil e comunidade.</li>
            <li>Atender solicitações e contatos iniciados pelo titular.</li>
            <li>Prevenir fraude, spam e uso abusivo, respeitando os direitos do titular.</li>
            <li>Cumprir obrigações legais, regulatórias e ordens de autoridades competentes.</li>
            <li>Registrar métricas opcionais e enviar push somente após uma escolha afirmativa.</li>
          </ul>
          <p className="mt-4">
            Dependendo da finalidade, usamos execução de contrato ou procedimentos preliminares,
            legítimo interesse com avaliação de necessidade, cumprimento de obrigação legal, exercício
            regular de direitos ou consentimento. O consentimento pode ser revogado sem afetar tratamentos
            anteriores realizados de forma válida.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-10 text-xl font-bold text-white">4. Armazenamento local e cookies</h2>
          <p>
            A sessão de login utiliza cookies necessários de autenticação e segurança. O navegador também
            guarda sua escolha de privacidade. O identificador persistente usado para métricas e reações só
            é criado após “Permitir métricas” e é apagado quando você escolhe “Só essenciais” ou revoga a
            preferência nesta página.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-10 text-xl font-bold text-white">5. Fornecedores e compartilhamento</h2>
          <p>Dados são compartilhados na medida necessária com fornecedores que sustentam o serviço:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li><strong className="text-white">Supabase:</strong> autenticação, banco, armazenamento e funções de backend.</li>
            <li><strong className="text-white">Google:</strong> autenticação social escolhida pelo usuário.</li>
            <li><strong className="text-white">Vercel:</strong> hospedagem e entrega do site.</li>
            <li><strong className="text-white">Serviços de push do navegador:</strong> entrega de notificações quando ativadas.</li>
          </ul>
          <p className="mt-4">
            O Orange Brick não vende dados pessoais. Imagens carregadas de domínios externos podem informar
            o IP do visitante ao respectivo provedor; por isso, novas publicações da comunidade não aceitam
            mais URLs arbitrárias de imagem.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-10 text-xl font-bold text-white">6. Transferência internacional</h2>
          <p>
            Alguns fornecedores podem processar dados fora do Brasil. Quando houver transferência
            internacional, ela deve observar a LGPD, as regras da ANPD e um mecanismo jurídico válido,
            além de medidas de segurança compatíveis com o risco. Informações sobre o mecanismo aplicável
            podem ser solicitadas pelo canal de privacidade.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-10 text-xl font-bold text-white">7. Retenção e eliminação</h2>
          <p>
            Dados de conta e comunidade são mantidos enquanto a conta estiver ativa ou enquanto forem
            necessários para prestar o serviço. Registros de segurança, atendimento, incidentes e
            obrigações legais podem permanecer pelo prazo necessário à finalidade ou ao exercício de
            direitos. A exclusão da conta remove os dados diretamente associados no banco ativo; cópias
            residuais em backup seguem o ciclo técnico restrito do fornecedor e não são reutilizadas.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-10 text-xl font-bold text-white">8. Direitos do titular</h2>
          <p>
            Você pode solicitar confirmação, acesso, correção, anonimização, bloqueio, eliminação,
            portabilidade quando aplicável, informação sobre compartilhamentos, revisão de decisões
            automatizadas e revogação do consentimento. Use os controles desta página ou escreva para o
            canal de privacidade. Podemos pedir informações adicionais para confirmar sua identidade.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-10 text-xl font-bold text-white">9. Crianças e adolescentes</h2>
          <p>
            A comunidade não é direcionada a crianças. Adolescentes devem participar com conhecimento e
            acompanhamento de seus responsáveis. Se houver indício de tratamento inadequado de dados de
            criança ou adolescente, o responsável pode solicitar análise e remoção pelo canal de
            privacidade. O melhor interesse do menor orientará a decisão.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-10 text-xl font-bold text-white">10. Segurança e incidentes</h2>
          <p>
            São aplicados controles de acesso, autenticação, políticas de banco, criptografia em trânsito,
            validação de entradas e limitação de abuso. Nenhum sistema é infalível. Incidentes com risco
            relevante serão avaliados e comunicados à ANPD e aos titulares nos casos e prazos previstos na
            regulamentação.
          </p>
        </section>

        <section>
          <h2 className="mb-3 mt-10 text-xl font-bold text-white">11. Atualizações e contato</h2>
          <p>
            Mudanças materiais serão destacadas no site e, quando a base legal exigir, será solicitada uma
            nova escolha. Dúvidas, denúncias ou pedidos relacionados a dados pessoais podem ser enviados para{" "}
            <a href="mailto:orangebrick0@gmail.com" className="text-brand-orange underline underline-offset-4">
              orangebrick0@gmail.com
            </a>.
          </p>
        </section>
      </article>
    </main>
  );
}
