export type QuizOption = {
  id: string
  label: string
  emoji?: string
  image?: string
  logo?: string
  badge?: { text: string; bg: string; color?: string }
}

export type QuizExtra = {
  title: string
  items: string[]
}

export type ResearchCitation = {
  tag: string
  source: string
  desc: string
  brand: string
  logo?: string
}

export type InsightBar = {
  label: string
  emoji?: string
  value: number
  valueLabel?: string
  crown?: boolean
}

export type FeatureItem = {
  num: string
  title: string
  desc: string
  icon: "layers" | "sliders" | "zap"
}

export type QuizStep =
  | {
      type: "single"
      id: string
      number: number
      question: string
      subtitle?: string
      layout?: "imagegrid"
      extra?: QuizExtra
      options: QuizOption[]
    }
  | {
      type: "multi"
      id: string
      number: number
      question: string
      subtitle?: string
      options: QuizOption[]
    }
  | {
      type: "insight"
      display: "retention"
      id: string
      label: string
      chartTitle: string
      chartLabels: string[]
      chartPoints: number[]
      stat: string
      heading: string
      sub: string
      research?: ResearchCitation
      cta: string
    }
  | {
      type: "insight"
      display: "bignumber"
      id: string
      bigPrefix?: string
      bigNumber: number
      bigSuffix?: string
      bigCaption: string
      body: string
      sites?: string[]
      centerLogo?: string
      cta: string
    }
  | {
      type: "insight"
      display: "feature"
      id: string
      headingDark: string
      headingGreen: string
      features: FeatureItem[]
      cta: string
    }
  | {
      type: "insight"
      display: "profitbars"
      id: string
      label: string
      lowLabel: string
      highLabel: string
      bars: InsightBar[]
      body: string[]
      cta: string
    }
  | {
      type: "insight"
      display: "emotionchart"
      id: string
      leftLabel: string
      rightLabel: string
      heading: string
      sub: string
      research?: ResearchCitation
      cta: string
    }
  | {
      type: "loader"
      id: string
      title: string
      steps: string[]
      popups?: LoaderPopup[]
    }

export type LoaderPopup = {
  kind: "intro" | "feature"
  badge?: string
  step?: string
  title: string
  subtitle?: string
  image?: string
  imageAlt?: string
  button: string
}

export const QUESTION_TOTAL = 15

export function getStoredAnswers(): Record<string, string | string[]> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.sessionStorage.getItem("premier_quiz")
    return raw ? (JSON.parse(raw) as Record<string, string | string[]>) : {}
  } catch {
    return {}
  }
}

export const quizSteps: QuizStep[] = [
  {
    type: "single",
    id: "age",
    number: 1,
    layout: "imagegrid",
    question: "Pra começar, qual a sua idade?",
    options: [
      { id: "18-29", label: "18 a 29", image: "/images/quiz/age-18-29.png" },
      { id: "30-44", label: "30 a 44", image: "/images/quiz/age-30-44.png" },
      { id: "45-59", label: "45 a 59", image: "/images/quiz/age-45-59.png" },
      { id: "60+", label: "60+", image: "/images/quiz/age-60.png" },
    ],
  },
  {
    type: "single",
    id: "experience",
    number: 2,
    question: "Há quanto tempo você aposta em futebol?",
    options: [
      { id: "3m", label: "Faz pouco, até 3 meses", emoji: "🌱" },
      { id: "3m-1y", label: "Entre 3 meses e 1 ano", emoji: "📖" },
      { id: "1-2y", label: "De 1 a 2 anos", emoji: "📘" },
      { id: "3-5y", label: "De 3 a 5 anos", emoji: "📒" },
      { id: "5y+", label: "Mais de 5 anos", emoji: "🧠" },
    ],
  },
  {
    type: "single",
    id: "motivation",
    number: 3,
    question: "O que te trouxe pro mundo das apostas?",
    options: [
      {
        id: "watch",
        label: "Já assisto futebol, por que não ganhar com isso",
        emoji: "📺",
      },
      {
        id: "friends",
        label: "Meus amigos apostam e eu quis entrar junto",
        emoji: "🤝",
      },
      {
        id: "income",
        label: "Renda extra, preciso de uma grana a mais",
        emoji: "💰",
      },
      {
        id: "knowledge",
        label: "Quis testar se meu conhecimento valia algo",
        emoji: "🧠",
      },
    ],
  },
  {
    type: "insight",
    display: "retention",
    id: "insight-retention",
    label: "Apostadores BR",
    chartTitle: "% que continuam apostando",
    chartLabels: ["0", "6m", "1a", "2a", "3a+"],
    chartPoints: [100, 81, 62, 40, 23],
    stat: "62%",
    heading: "Você tá na fase em que mais apostadores desistem.",
    sub: "A diferença entre desistir e continuar é uma só: ter a ferramenta certa pra decidir com dado.",
    research: {
      tag: "Pesquisa de opinião",
      source: "Datafolha · 2024",
      desc: "Estudo sobre comportamento de apostadores brasileiros",
      brand: "Datafolha",
      logo: "/images/research/datafolha.webp",
    },
    cta: "Continuar",
  },
  {
    type: "single",
    id: "moment",
    number: 4,
    question: "Você prefere apostar pré-jogo ou ao vivo?",
    options: [
      { id: "pre", label: "Pré-jogo, gosto de estudar antes", emoji: "🎯" },
      { id: "live", label: "Ao vivo, entro durante o jogo", emoji: "🔥" },
      { id: "both", label: "Os dois, depende do dia", emoji: "🔄" },
    ],
  },
  {
    type: "multi",
    id: "markets",
    number: 6,
    question: "Quais mercados você mais aposta?",
    subtitle: "Pode marcar mais de um.",
    options: [
      { id: "winner", label: "Vencedor da partida", emoji: "🏆" },
      { id: "overunder", label: "Mais/Menos gols (over/under)", emoji: "⚽" },
      { id: "btts", label: "Ambas as equipes marcam", emoji: "🤝" },
      { id: "corners", label: "Escanteios", emoji: "🚩" },
      { id: "cards", label: "Cartões", emoji: "🟨" },
      { id: "handicap", label: "Handicap asiático/europeu", emoji: "⚖️" },
      { id: "exact", label: "Placar exato", emoji: "🎯" },
      { id: "halves", label: "1º / 2º tempo separado", emoji: "⏱️" },
    ],
  },
  {
    type: "single",
    id: "bankroll",
    number: 7,
    question: "Quanto da sua banca você costuma arriscar por aposta?",
    options: [
      { id: "1-2", label: "1 a 2% da banca, disciplinado", emoji: "🧘" },
      { id: "3-10", label: "3 a 10% da banca", emoji: "📊" },
      { id: "10-20", label: "10 a 20% da banca", emoji: "🔥" },
      { id: "20+", label: "20%+, vou com tudo", emoji: "💥" },
      { id: "none", label: "Não acompanho isso direito", emoji: "🤷" },
    ],
  },
  {
    type: "multi",
    id: "leagues",
    number: 8,
    question: "Em quais ligas/competições você costuma apostar?",
    subtitle: "Pode marcar mais de uma.",
    options: [
      {
        id: "br-a",
        label: "Brasileirão Série A",
        logo: "/images/leagues/brasileirao-a.webp",
      },
      {
        id: "copa-br",
        label: "Copa do Brasil",
        logo: "/images/leagues/copa-do-brasil.webp",
      },
      {
        id: "br-bc",
        label: "Série B / C",
        logo: "/images/leagues/serie-b-c.webp",
      },
      {
        id: "premier",
        label: "Premier League",
        logo: "/images/leagues/premier-league.webp",
      },
      {
        id: "laliga",
        label: "La Liga",
        logo: "/images/leagues/la-liga.webp",
      },
      {
        id: "ucl",
        label: "Champions League",
        logo: "/images/leagues/champions-league.webp",
      },
      {
        id: "liberta",
        label: "Libertadores · Sul-Americana",
        logo: "/images/leagues/libertadores.webp",
      },
      { id: "others", label: "Acompanho outras ligas", emoji: "♾️" },
    ],
  },
  {
    type: "insight",
    display: "bignumber",
    id: "insight-sites",
    bigPrefix: "+",
    bigNumber: 50,
    bigCaption: "Sites de estatísticas conectados à Arena",
    body:
      "Cada liga que você acompanha é cruzada por dezenas de sites ao mesmo tempo, em tempo real.",
    centerLogo: "/premier-mark.png",
    sites: [
      "/images/sites/sofascore.webp",
      "/images/sites/flashscore.webp",
      "/images/sites/fotmob.webp",
      "/images/sites/fbref.webp",
      "/images/sites/transfermarkt.webp",
      "/images/sites/oddspedia.webp",
      "/images/sites/footstats.webp",
      "/images/sites/soccerstats.webp",
    ],
    cta: "Continuar",
  },
  {
    type: "multi",
    id: "method",
    number: 9,
    question: "Como você geralmente decide em que apostar?",
    subtitle: "Pode marcar mais de um.",
    options: [
      { id: "tips", label: "Sigo tips de Telegram / Insta", emoji: "📱" },
      { id: "stats", label: "Vejo estatística e tabela na hora", emoji: "📊" },
      { id: "friend", label: "Palpite de amigo ou grupo", emoji: "👥" },
      { id: "intuition", label: "Sigo intuição, vai no que parece certo", emoji: "🤞" },
      { id: "nomethod", label: "Não tenho método definido", emoji: "🤷" },
    ],
  },
  {
    type: "single",
    id: "decision-time",
    number: 10,
    question: "Quanto tempo você tem pra decidir quando vê o jogo começando?",
    options: [
      { id: "seconds", label: "Segundos, tô na rua", emoji: "🏃" },
      { id: "minutes", label: "Poucos minutos", emoji: "⏳" },
      { id: "halfhour", label: "Meia hora no máximo", emoji: "🕐" },
      { id: "plenty", label: "Tenho tempo de sobra", emoji: "🧘" },
    ],
  },
  {
    type: "single",
    id: "missed",
    number: 11,
    question: "Já perdeu uma entrada boa só porque não teve tempo de analisar?",
    options: [
      { id: "many", label: "Sim, várias vezes", emoji: "😩" },
      { id: "some", label: "Já aconteceu algumas vezes", emoji: "😔" },
      { id: "rare", label: "Raramente", emoji: "🤏" },
      { id: "never", label: "Não costumo perder por isso", emoji: "🙌" },
    ],
  },
  {
    type: "insight",
    display: "profitbars",
    id: "insight-profit",
    label: "Lucro médio anual",
    lowLabel: "Perde",
    highLabel: "Lucra",
    bars: [
      { label: "Telegram", emoji: "📱", value: -42 },
      { label: "Intuição", emoji: "🤞", value: -28 },
      { label: "Amigo", emoji: "👥", value: -14, valueLabel: "~14%" },
      { label: "Estatística", emoji: "📊", value: 6 },
      { label: "ARENA", emoji: "🏆", value: 24, crown: true },
    ],
    body: [
      "O problema nunca foi você. Era o método.",
      "Apostar com dados e a ferramenta certa, faz a sua banca crescer.",
    ],
    cta: "Continuar",
  },
  {
    type: "single",
    id: "result",
    number: 12,
    question: "E hoje, qual o resultado real das suas apostas?",
    subtitle: "Sinceridade aqui é o que vai te dar o diagnóstico certo.",
    options: [
      { id: "losing", label: "Estou perdendo dinheiro", emoji: "📉" },
      { id: "even", label: "Mais ou menos no zero", emoji: "⚖️" },
      { id: "small", label: "Algum lucro, nada absurdo", emoji: "💵" },
      { id: "consistent", label: "Lucro consistente", emoji: "💰" },
    ],
  },
  {
    type: "single",
    id: "control",
    number: 13,
    question: "Você costuma perder o controle e tentar recuperar a perda?",
    subtitle: "Honestidade total. Só você lê isso.",
    options: [
      { id: "never", label: "Nunca, mantenho disciplina", emoji: "🧘" },
      { id: "sometimes", label: "Às vezes, tento controlar", emoji: "😅" },
      { id: "often", label: "Mais do que gostaria de admitir", emoji: "🤦" },
    ],
  },
  {
    type: "insight",
    display: "emotionchart",
    id: "insight-emotion",
    leftLabel: "Decisão na emoção",
    rightLabel: "Com Arena",
    heading: "Quebrar a banca é consequência de apostar na emoção.",
    sub: "68% dos apostadores brasileiros admitem que já perderam o controle e tentaram recuperar perdas.",
    research: {
      tag: "Pesquisa acadêmica",
      source: "USP · 2026",
      desc: "Núcleo de Economia Comportamental, estudo sobre decisão sob risco",
      brand: "USP",
      logo: "/images/research/usp.webp",
    },
    cta: "Continuar",
  },
  {
    type: "single",
    id: "problem",
    number: 14,
    question: "Qual o seu maior problema com apostas hoje?",
    options: [
      { id: "time", label: "Não tenho tempo de analisar", emoji: "⏰" },
      { id: "trust", label: "Não confio nas fontes", emoji: "🚫" },
      { id: "stats", label: "Não entendo de estatística", emoji: "🤯" },
      { id: "losing", label: "Perco mais do que ganho", emoji: "😤" },
    ],
  },
  {
    type: "single",
    id: "solution",
    number: 15,
    question: "Isso resolve o seu problema?",
    subtitle: "Em 1 toque, a odd já vem pronta dentro do app.",
    extra: {
      title: "Você não precisa mais de",
      items: [
        "Ver a classificação",
        "Analisar estatística de jogador",
        "Grupo de Telegram",
      ],
    },
    options: [
      { id: "yes", label: "Sim, ajudaria muito", emoji: "🔥" },
      { id: "good", label: "Parece bom", emoji: "🙂" },
      { id: "show", label: "Quero ver funcionar primeiro", emoji: "🤔" },
    ],
  },
  {
    type: "insight",
    display: "feature",
    id: "insight-feature",
    headingDark: "Não é palpite.",
    headingGreen: "É previsão calculada com +50 sites.",
    features: [
      {
        num: "01",
        title: "+50 sites cruzados em tempo real.",
        desc: "SofaScore, Flashscore, Radar Esportivo e outros 47 alimentam cada cálculo, antes do jogo começar.",
        icon: "layers",
      },
      {
        num: "02",
        title: "800 mil jogos históricos no filtro.",
        desc: "Forma, mando, lesões, clima, escalação confirmada. Cada cenário comparado com o que já aconteceu.",
        icon: "sliders",
      },
      {
        num: "03",
        title: "Você abre o app. A odd já tá lá.",
        desc: "Bilhete montado, entrada filtrada, dentro do app. Você só confirma.",
        icon: "zap",
      },
    ],
    cta: "Faz sentido, continuar",
  },
  {
    type: "loader",
    id: "loader",
    title: "Analisando o seu perfil...",
    steps: [
      "Processando suas respostas",
      "Cruzando +50 sites de estatísticas",
      "Calculando seu perfil de apostador",
      "Montando sua estratégia personalizada",
    ],
    popups: [
      {
        kind: "intro",
        title: "Seu plano tá sendo montado.",
        subtitle:
          "Te apresento as 2 funcionalidades principais do app enquanto isso. Leva 30 segundos.",
        button: "Pode mostrar",
      },
      {
        kind: "feature",
        badge: "Funcionalidade 1",
        step: "1 de 2",
        title: "Tips Prontas",
        subtitle:
          "A IA monta uma seleção de bilhetes prontos todo dia. Do mais seguro ao mais agressivo. Você escolhe o perfil e copia.",
        image: "/images/app/tips-ai.gif",
        imageAlt: "Bilhetes de apostas prontos no app Arena FC",
        button: "Continuar",
      },
      {
        kind: "feature",
        badge: "Funcionalidade 2",
        step: "2 de 2",
        title: "Tips AI",
        subtitle:
          "Quando você quer um jogo específico, é só pedir. Diz o confronto e o retorno que busca, a IA cruza os dados e devolve a entrada pronta.",
        image: "/images/app/tips-prontas.gif",
        imageAlt: "Chat da IA Tipster no app Arena FC",
        button: "Entendi",
      },
    ],
  },
]
