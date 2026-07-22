import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Política de Privacidade do Orange Brick — como coletamos, usamos e protegemos seus dados pessoais.",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-dvh bg-background-void text-white px-4 py-12">
      <article className="max-w-3xl mx-auto space-y-6 font-sans text-sm leading-relaxed text-gray-300">
        <h1 className="text-3xl font-black uppercase text-white mb-8">Política de Privacidade</h1>
        <p className="text-gray-500 text-xs">Última atualização: Julho de 2026</p>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">1. Quem somos</h2>
          <p>
            O <strong>Orange Brick</strong> é um portal de notícias sobre games, hardware, indústria e cultura gaming.
            Esta Política de Privacidade explica como tratamos os dados pessoais dos nossos usuários e leitores,
            em conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">2. Dados que coletamos</h2>
          <p>Podemos coletar as seguintes informações:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Dados de cadastro:</strong> nome, e-mail e foto do perfil (quando você faz login via Google OAuth).</li>
            <li><strong>Dados de navegação:</strong> endereço IP, tipo de navegador, páginas visitadas, data e hora do acesso.</li>
            <li><strong>Dados de interação:</strong> comentários, reações em posts, e preferências de conteúdo.</li>
            <li><strong>Cookies:</strong> utilizamos cookies essenciais para o funcionamento do site e cookies opcionais para analytics.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">3. Como usamos seus dados</h2>
          <p>Seus dados são utilizados para:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Autenticar sua conta via login social (Google).</li>
            <li>Permitir que você comente e reaja a posts.</li>
            <li>Melhorar a experiência do site com base no comportamento de navegação.</li>
            <li>Enviar notificações push (apenas com seu consentimento explícito).</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">4. Base legal para o tratamento</h2>
          <p>Tratamos seus dados com base nas seguintes hipóteses legais da LGPD:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Consentimento:</strong> para cookies não essenciais e notificações push.</li>
            <li><strong>Execução de contrato:</strong> para viabilizar o funcionamento da plataforma e da sua conta.</li>
            <li><strong>Legítimo interesse:</strong> para analytics e melhoria do serviço.</li>
            <li><strong>Cumprimento de obrigação legal:</strong> quando exigido por lei.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">5. Compartilhamento de dados</h2>
          <p>Compartilhamos seus dados apenas com:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Supabase:</strong> nosso provedor de banco de dados e autenticação (hospedado nos EUA).</li>
            <li><strong>Google:</strong> provedor de login OAuth — apenas o e-mail e nome público.</li>
            <li><strong>Vercel:</strong> plataforma de hospedagem do site.</li>
          </ul>
          <p className="mt-2">Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins de marketing.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">6. Seus direitos como titular (LGPD)</h2>
          <p>Você tem direito a:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Confirmação e acesso:</strong> saber quais dados tratamos e solicitar uma cópia.</li>
            <li><strong>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados.</li>
            <li><strong>Anonimização, bloqueio ou eliminação:</strong> solicitar a remoção de dados desnecessários.</li>
            <li><strong>Portabilidade:</strong> solicitar a transferência dos seus dados a outro fornecedor.</li>
            <li><strong>Eliminação:</strong> solicitar a exclusão completa da sua conta e dados associados.</li>
            <li><strong>Revogação do consentimento:</strong> retirar seu consentimento a qualquer momento.</li>
          </ul>
          <p className="mt-2">
            Para exercer qualquer um desses direitos, entre em contato pelo e-mail:{ " " }
            <a href="mailto:orangebrick0@gmail.com" className="text-brand-orange hover:underline">orangebrick0@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">7. Cookies</h2>
          <p>
            Utilizamos cookies essenciais para o funcionamento do site (autenticação e segurança).
            Cookies de analytics e preferências são opcionais e podem ser gerenciados no banner de cookies.
            Você pode configurar seu navegador para recusar cookies, mas algumas funcionalidades podem ser afetadas.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">8. Segurança dos dados</h2>
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia em trânsito (TLS),
            controle de acesso baseado em funções (RBAC), e monitoramento contínuo de segurança.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">9. Retenção dos dados</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Após solicitação de exclusão,
            todos os dados pessoais são removidos em até 30 dias, exceto quando a retenção for exigida por lei.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">10. Transferência internacional</h2>
          <p>
            Seus dados podem ser armazenados e processados em servidores localizados nos Estados Unidos,
            com garantias de proteção equivalentes às da LGPD por meio de cláusulas contratuais padrão.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">11. Alterações nesta política</h2>
          <p>
            Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças significativas
            através do site ou por e-mail. Recomendamos revisar esta página regularmente.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">12. Contato com o encarregado (DPO)</h2>
          <p>
            Para questões relacionadas à LGPD e ao tratamento dos seus dados, entre em contato com nosso
            Encarregado de Proteção de Dados (DPO):
          </p>
          <p className="mt-2">
            <strong>E-mail:</strong>{" "}
            <a href="mailto:orangebrick0@gmail.com" className="text-brand-orange hover:underline">orangebrick0@gmail.com</a>
          </p>
        </section>
      </article>
    </main>
  );
}
