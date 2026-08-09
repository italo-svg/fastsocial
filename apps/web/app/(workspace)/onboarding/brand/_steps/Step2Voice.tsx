interface Step2Data {
  toneOfVoice: string;
  examples: string;
}

interface Step2VoiceProps {
  data: Step2Data;
  onChange: (data: Step2Data) => void;
}

export function Step2Voice({ data, onChange }: Step2VoiceProps): JSX.Element {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Qual é o tom de voz da sua marca?</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Descreva como sua marca se comunica — a IA usará isso para escrever as legendas.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Tom de voz</label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="Ex: Direto, motivador, sem jargões técnicos, próximo do cliente."
          value={data.toneOfVoice}
          onChange={(e) => onChange({ ...data, toneOfVoice: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Cole exemplos de textos já usados pela marca (opcional)
        </label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="Cole aqui legendas, e-mails ou textos que representem bem sua marca."
          value={data.examples}
          onChange={(e) => onChange({ ...data, examples: e.target.value })}
        />
      </div>
    </div>
  );
}
