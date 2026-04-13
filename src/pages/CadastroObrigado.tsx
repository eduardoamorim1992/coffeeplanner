import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";

export default function CadastroObrigado() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-card p-8 w-full max-w-sm space-y-4 text-center">
        <MailCheck className="w-12 h-12 mx-auto text-emerald-400" />
        <h2 className="text-lg font-semibold text-foreground">
          Cadastro enviado
        </h2>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Seus dados foram registrados. Um administrador vai analisar e aprovar
          seu acesso. Quando estiver liberado, use o mesmo email e senha no
          login.
        </p>
        <Link
          to="/login"
          className="inline-block w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-medium text-center"
        >
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}
