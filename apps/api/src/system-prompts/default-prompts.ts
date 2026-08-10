// Conteúdo ORIGINAL hardcoded nos specs 017/018/022/023, usado em dois lugares:
// (1) seed-prompts.ts grava isto como version=1 no primeiro deploy (CA-05);
// (2) SystemPromptsService usa como fallback em memória se por algum motivo a
// linha ainda não existir no banco (nunca quebra a geração de IA por causa de
// uma migração/seed que não rodou ainda).
export const KNOWN_PROMPT_KEYS = [
  "copy_generation_static_post",
  "copy_generation_carousel",
  "copy_generation_reels_script",
  "scene_director",
  "qa_vision",
  "image_negative_list",
  "image_brand_identity_lock_template",
  "image_slot_constraint",
] as const;

export type PromptKey = (typeof KNOWN_PROMPT_KEYS)[number];

export const DEFAULT_PROMPTS: Record<PromptKey, string> = {
  copy_generation_static_post:
    "Escreva uma legenda para um post estático de Instagram/Facebook: um gancho forte na primeira linha, " +
    "seguido da legenda completa (150-300 caracteres no total). Escreva em português do Brasil.",

  copy_generation_carousel:
    "Escreva o texto de cada slide de um carrossel de {{slideCount}} slides: o slide 1 é sempre a capa " +
    "(gancho forte), o slide {{slideCount}} é sempre um CTA. Um texto curto por slide. Escreva em português do Brasil.",

  copy_generation_reels_script:
    "Escreva um roteiro de Reels/vídeo curto, dividido em cenas com marcação de tempo (formato " +
    '"[0-3s]", "[3-8s]" etc.), cobrindo do gancho inicial ao CTA final. Não gere vídeo, só o texto do ' +
    "roteiro. Escreva em português do Brasil.",

  scene_director:
    "Você é um diretor de fotografia. Dado o tema de um post e o nicho/tom da marca, descreva em " +
    "2-3 frases, em inglês, um cenário fotográfico concreto (sujeito, ambiente, ação/mood) que " +
    "ilustre o tema SEM ilustrar o texto literalmente e SEM clichês óbvios de banco de imagens " +
    '(ex: para um tema sobre "economia de tempo", não use um relógio genérico). Nunca mencione ' +
    "texto, palavras ou tipografia na cena. Termine incluindo, literalmente, a instrução de espaço " +
    "negativo fornecida.",

  qa_vision:
    "Você é um QA de fidelidade de marca para imagens geradas por IA. Responda APENAS com um JSON " +
    'válido no formato {"brandFitScore":number,"artifactScore":number,"negativeSpaceScore":number,' +
    '"reasoning":string}, notas de 0 a 10, sem nenhum texto fora do JSON.',

  // Copiada literalmente do PRD Seção 7.7 — editável via Super Admin a partir do spec 048,
  // mas qualquer mudança aqui deve ser refletida na fonte normativa (PRD).
  image_negative_list:
    "no legible text, no logos, no watermarks, no distorted hands or faces, no plastic-looking skin, " +
    "no AI-generated symmetrical face artifacts, no oversaturated HDR, no generic stock-photo composition, " +
    "no clipart, no extra limbs, no uncanny-valley expressions",

  image_brand_identity_lock_template:
    "Photography direction for {{brandName}}, a {{niche}} brand. Visual signature: {{toneKeywords}}. " +
    "Color story: {{colorStory}}, used only as accent tones in props, wardrobe or lighting gel — never as a " +
    "flat graphic background fill.",

  image_slot_constraint:
    "Generate background/scene only — this image will be composited with logo and text afterward. " +
    "Leave the designated text-safe zone visually calm.",
};
