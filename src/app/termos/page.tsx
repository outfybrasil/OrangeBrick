import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso do Orange Brick — regras, direitos e responsabilidades ao utilizar o portal.",
};

export default function TermosPage() {
  return (
    <main className="min-h-dvh bg-background-void px-3 py-8 text-white sm:px-4 sm:py-12">
      <article className="max-w-3xl mx-auto space-y-6 font-sans text-sm leading-relaxed text-gray-300">
        <h1 className="text-3xl font-black uppercase text-white mb-8">Termos de Uso</h1>
        <p className="text-gray-500 text-xs">Última atualização: Julho de 2026</p>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">1. Aceitação dos termos</h2>
          <p>
            Ao acessar ou utilizar o <strong>Orange Brick</strong>, você concorda com estes Termos de Uso.
            Se não concordar com qualquer parte destes termos, não utilize o site. A identificação completa
            do responsável pela operação pode ser solicitada pelo canal de contato indicado na plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">2. Definições</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Plataforma:</strong> o site Orange Brick e todos os seus serviços e funcionalidades.</li>
            <li><strong>Usuário:</strong> qualquer pessoa que acesse ou interaja com a plataforma.</li>
            <li><strong>Conteúdo:</strong> textos, imagens, vídeos e demais materiais publicados na plataforma.</li>
            <li><strong>Conta:</strong> registro de usuário na plataforma, criado via autenticação Google.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">3. Conteúdo editorial</h2>
          <p>
            Todo o conteúdo editorial publicado no Orange Brick é de propriedade exclusiva da equipe,
            salvo quando explicitamente creditado a terceiros. É proibida a reprodução total ou parcial
            do conteúdo sem autorização prévia por escrito.
          </p>
          <p className="mt-2">
            O Orange Brick não se responsabiliza por opiniões expressas em artigos categorizados como
            &quot;Opinião&quot;, que refletem exclusivamente a visão de seus autores.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">4. Comentários e interações</h2>
          <p>Ao comentar ou interagir na plataforma, você concorda que:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Não publicará conteúdo difamatório, ofensivo, ilegal ou que viole direitos de terceiros.</li>
            <li>Não fará spam, propaganda não autorizada ou divulgação de links maliciosos.</li>
            <li>Não se passará por outra pessoa ou entidade.</li>
            <li>O Orange Brick reserva-se o direito de moderar, editar ou excluir qualquer conteúdo
            que viole estes termos, sem aviso prévio.</li>
            <li>Usuários que violarem estas regras poderão ter suas contas suspensas ou banidas.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">5. Propriedade intelectual</h2>
          <p>
            Todos os direitos de propriedade intelectual do Orange Brick — incluindo marca, design,
            logo, código-fonte e conteúdo editorial próprio — pertencem ao Orange Brick ou aos titulares
            que autorizaram seu uso.
          </p>
          <p className="mt-2">
            Marcas registradas de terceiros (nomes de jogos, consoles, empresas) são propriedade de seus
            respectivos titulares e são utilizadas apenas para fins jornalísticos e editoriais.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">6. Contas de usuário</h2>
          <p>
            Para comentar e interagir com a comunidade, é necessário criar uma conta via Google OAuth.
            Você é responsável por manter a confidencialidade da sua conta e por todas as atividades
            realizadas através dela.
          </p>
          <p className="mt-2">
            O Orange Brick não recebe nem armazena a senha da sua conta Google. Credenciais próprias podem
            ser usadas apenas em áreas administrativas restritas e são processadas pelo provedor de autenticação.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">7. Moderação, denúncia e recurso</h2>
          <p>
            Conteúdo ou conta que viole estes termos pode ser restringido ou removido. Sempre que cabível,
            o usuário será informado sobre o motivo e poderá pedir reconsideração pelo e-mail{" "}
            <a href="mailto:orangebrick0@gmail.com" className="text-brand-orange hover:underline">
              orangebrick0@gmail.com
            </a>. Denúncias de fraude, ameaça, assédio, exploração de menores, violação de direitos ou
            conteúdo ilegal podem ser enviadas permanentemente pelo mesmo canal.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">8. Crianças e adolescentes</h2>
          <p>
            A comunidade não é direcionada a crianças. Adolescentes devem usar o serviço com autorização e
            acompanhamento de seus responsáveis. O Orange Brick poderá restringir recursos, solicitar
            confirmação adicional ou remover dados quando necessário para proteger o melhor interesse do menor.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">9. Limitação de responsabilidade</h2>
          <p>
            O Orange Brick não se responsabiliza por:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Danos diretos ou indiretos decorrentes do uso ou da impossibilidade de uso da plataforma.</li>
            <li>Conteúdo de sites de terceiros linkados na plataforma.</li>
            <li>Interrupções temporárias do serviço para manutenção ou por causas além do nosso controle.</li>
            <li>Precisão, completude ou atualidade de informações de terceiros republicadas no site.</li>
          </ul>
          <p className="mt-2">
            A plataforma é fornecida no estado técnico disponível. Nenhuma disposição destes termos exclui
            direitos ou responsabilidades que não possam ser afastados pela legislação brasileira.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">10. Privacidade e dados pessoais</h2>
          <p>
            O tratamento de dados pessoais é regido pela nossa{" "}
            <a href="/privacidade" className="text-brand-orange hover:underline">Política de Privacidade</a>,
            que faz parte integrante destes Termos de Uso.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">11. Disposições gerais</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Estes termos são regidos pela legislação brasileira.</li>
            <li>Fica preservado o foro legalmente competente, inclusive o domicílio do consumidor quando aplicável.</li>
            <li>Se qualquer disposição destes termos for considerada inválida, as demais permanecem em vigor.</li>
            <li>O fato de não exigirmos o cumprimento de alguma cláusula não constitui renúncia de direito.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">12. Alterações nos termos</h2>
          <p>
            Estes Termos de Uso podem ser alterados a qualquer momento. Alterações significativas serão
            comunicadas aos usuários cadastrados por e-mail ou aviso no site.
            Quando a lei ou a natureza da mudança exigir nova manifestação, ela será solicitada antes da
            continuidade do tratamento ou do recurso afetado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mt-8 mb-3">13. Contato</h2>
          <p>
            Para dúvidas sobre estes Termos de Uso, entre em contato:
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
