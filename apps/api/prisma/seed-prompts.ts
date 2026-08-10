import { PrismaClient } from "@prisma/client";
import { DEFAULT_PROMPTS, KNOWN_PROMPT_KEYS } from "../src/system-prompts/default-prompts";

const prisma = new PrismaClient();

// CA-05: idempotente (upsert com update:{} — não sobrescreve se o Super Admin
// já editou o prompt antes deste script rodar de novo por engano) e nunca
// quebra o comportamento atual, porque DEFAULT_PROMPTS é uma cópia literal do
// que já estava hardcoded nos specs 017/018/022/023.
async function main() {
  for (const key of KNOWN_PROMPT_KEYS) {
    const existing = await prisma.systemPrompt.findUnique({ where: { promptKey: key } });
    if (existing) {
      console.log(`"${key}" já existe (version=${existing.currentVersion}), pulando.`);
      continue;
    }

    await prisma.$transaction([
      prisma.systemPrompt.create({
        data: { promptKey: key, content: DEFAULT_PROMPTS[key], currentVersion: 1 },
      }),
      prisma.systemPromptVersion.create({
        data: { promptKey: key, version: 1, content: DEFAULT_PROMPTS[key] },
      }),
    ]);
    console.log(`"${key}" semeado como version=1.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
