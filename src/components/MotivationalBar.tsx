import { useEffect, useState } from "react";

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
      }, 300);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fraseAtual = frases[index];

  return (
    <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl p-6 shadow-lg">
      <div
        className={`transition-opacity duration-300 ${
          fade ? "opacity-100" : "opacity-0"
        }`}
      >
        <p className="text-lg font-semibold text-white tracking-wide text-center">
          "{fraseAtual.text}"
        </p>

        <p className="mt-3 text-sm text-zinc-400 text-center italic">
          — {fraseAtual.author}
        </p>
      </div>
    </div>
  );
}