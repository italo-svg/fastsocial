import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demo = await prisma.workspace.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo Workspace",
      slug: "demo",
      planType: "trial",
      status: "active",
      subscription: {
        create: {
          planType: "trial",
          maxSocialAccounts: 1,
          maxPostsPerMonth: 20,
          billingStatus: "active",
        },
      },
    },
  });

  const systemTemplates = [
    {
      format: "static_post",
      previewUrl: null,
      slotMap: {
        zones: [
          { id: "bg", type: "image", slideIndex: 0, x: 0, y: 0, width: 1080, height: 1080 },
          { id: "headline", type: "text", slideIndex: 0, x: 80, y: 700, width: 920, height: 200, label: "Headline", maxLength: 80 },
          { id: "logo", type: "logo", slideIndex: 0, x: 40, y: 40, width: 120, height: 120 },
        ],
      },
    },
    {
      format: "carousel",
      previewUrl: null,
      slotMap: {
        zones: [
          { id: "bg-1", type: "image", slideIndex: 0, x: 0, y: 0, width: 1080, height: 1350 },
          { id: "headline-1", type: "text", slideIndex: 0, x: 80, y: 900, width: 920, height: 300, label: "Capa", maxLength: 100 },
          { id: "bg-2", type: "image", slideIndex: 1, x: 0, y: 0, width: 1080, height: 1350 },
          { id: "body-2", type: "text", slideIndex: 1, x: 80, y: 100, width: 920, height: 1000, label: "Conteúdo", maxLength: 300 },
        ],
      },
    },
  ];

  const existingSystemTemplates = await prisma.templateAsset.count({
    where: { isSystemTemplate: true },
  });
  if (existingSystemTemplates > 0) {
    console.log("Templates de sistema já existem, pulando.");
    return;
  }

  for (const t of systemTemplates) {
    await prisma.templateAsset.create({
      data: {
        workspaceId: null,
        source: "system",
        format: t.format,
        slotMap: t.slotMap,
        previewUrl: t.previewUrl,
        isSystemTemplate: true,
      },
    });
  }

  console.log(`Seed concluído. Workspace demo: ${demo.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
