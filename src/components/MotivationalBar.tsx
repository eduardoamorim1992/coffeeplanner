import { useEffect, useState } from "react";
import { Quote } from "lucide-react";

const frases = [
  { text: "Você não sobe ao nível das suas metas, você cai ao nível dos seus sistemas.", author: "James Clear" },
  { text: "A disciplina é a ponte entre metas e realizações.", author: "Jim Rohn" },
  { text: "Primeiro o mais importante.", author: "Stephen Covey" },
  { text: "Excelência não é um ato, é um hábito.", author: "Aristóteles" },
  { text: "Foco é dizer não para centenas de boas ideias.", author: "Steve Jobs" },
  { text: "A melhor forma de prever o futuro é criá-lo.", author: "Peter Drucker" },
  { text: "Alta performance exige consistência, não intensidade ocasional.", author: "Autor desconhecido" },
  { text: "Grandes resultados exigem grandes decisões.", author: "Tony Robbins" },
  { text: "O sucesso é construído diariamente.", author: "Robin Sharma" },
  { text: "Organização gera liberdade.", author: "Brian Tracy" },
  { text: "Seja proativo.", author: "Stephen Covey" },
  { text: "O que não é medido não é gerenciado.", author: "Peter Drucker" },
  { text: "Pequenos progressos diários levam a grandes resultados.", author: "John Maxwell" },
  { text: "Você é o que você faz repetidamente.", author: "Aristóteles" },
  { text: "Clareza gera execução.", author: "Autor desconhecido" },
  { text: "Alta performance é constância sob pressão.", author: "Autor desconhecido" },
  { text: "Ação gera motivação.", author: "Mel Robbins" },
  { text: "O ambiente certo acelera resultados.", author: "James Clear" },
  { text: "Comece com o objetivo em mente.", author: "Stephen Covey" },
  { text: "Disciplina supera motivação.", author: "Jocko Willink" }
];

export function MotivationalBar() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);

      setTimeout(() => {
        setIndex((prev) => (prev + 1) % frases.length);
        setFade(true);
      }, 200);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fraseAtual = frases[index];

  return (
    <div className="relative overflow-hidden rounded-xl bg-muted/30 px-3 py-2 dark:bg-zinc-900/50">
      <div
        className={`flex items-start gap-2 transition-opacity duration-300 ${
          fade ? "opacity-100" : "opacity-0"
        }`}
      >
        <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" aria-hidden />
        <p className="text-xs leading-snug text-foreground/85 sm:text-[13px] dark:text-zinc-300">
          <span className="font-medium">{fraseAtual.text}</span>
          <span className="ml-1.5 italic text-muted-foreground">
            — {fraseAtual.author}
          </span>
        </p>
      </div>
    </div>
  );
}