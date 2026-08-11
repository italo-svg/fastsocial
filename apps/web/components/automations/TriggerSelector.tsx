"use client";

import { useSocialAccounts } from "@/hooks/useSocialAccounts";
import type { AutomationTrigger, TriggerType } from "@/hooks/useAutomations";

const TRIGGER_LABELS: Record<TriggerType, string> = {
  comment: "Comentário em publicação contém",
  message: "Mensagem direta contém",
  story_reply: "Resposta a story contém",
};

interface TriggerSelectorProps {
  value: AutomationTrigger;
  onChange: (trigger: AutomationTrigger) => void;
}

export function TriggerSelector({ value, onChange }: TriggerSelectorProps): JSX.Element {
  const { data: socialAccounts, isLoading } = useSocialAccounts();
  const instagramAccounts = (socialAccounts ?? []).filter((a) => a.network === "instagram");

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Gatilho</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Conta do Instagram</label>
          <select
            value={value.socialAccountId}
            onChange={(e) => onChange({ ...value, socialAccountId: e.target.value })}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none"
          >
            <option value="" disabled>
              {isLoading ? "Carregando contas..." : "Selecione uma conta"}
            </option>
            {instagramAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.displayName ?? account.externalAccountId}
              </option>
            ))}
          </select>
          {!isLoading && instagramAccounts.length === 0 && (
            <p className="mt-1 text-xs text-danger">Nenhuma conta do Instagram conectada em Conexões.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Tipo de gatilho</label>
          <select
            value={value.triggerType}
            onChange={(e) => onChange({ ...value, triggerType: e.target.value as TriggerType })}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none"
          >
            {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map((type) => (
              <option key={type} value={type}>
                {TRIGGER_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">Palavra-chave</label>
        <input
          type="text"
          value={value.matchValue}
          onChange={(e) => onChange({ ...value, matchValue: e.target.value })}
          placeholder="ex: preço, quero, promo"
          className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Dispara quando o texto contém essa palavra (não diferencia maiúsculas/minúsculas).
        </p>
      </div>
    </div>
  );
}
