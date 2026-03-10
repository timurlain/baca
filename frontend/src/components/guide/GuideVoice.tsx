export default function GuideVoice() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Hlasový vstup</h1>

      <p className="text-gray-700">
        Nemáš čas psát? Řekni úkol nahlas a Bača ho zpracuje za tebe.
      </p>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Jak na to</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Stiskni zelené tlačítko s mikrofonem (na stránce <strong>Hlas</strong> nebo plovoucí tlačítko na boardu). Pod tlačítkem se zobrazí ukázkový text, jak mluvit.</li>
          <li>Mluv česky, přirozeně. Například: <em>„Koupit lano na scénu 3, vysoká priorita, přiřadit Tomášovi."</em></li>
          <li>Stiskni <strong>červené tlačítko</strong> pro zastavení nahrávání.</li>
          <li>AI vyplní formulář — zkontroluj a uprav, co je potřeba.</li>
          <li>Stiskni <strong>„Uložit úkol"</strong>.</li>
        </ol>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Co AI rozpozná</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Název</strong> úkolu</li>
          <li><strong>Přiřazeno</strong> — jméno organizátora</li>
          <li><strong>Kategorie</strong> — Hra, Logistika, Jídlo, Rekvizity, Komunikace</li>
          <li><strong>Priorita</strong> — Nízká, Střední, Vysoká</li>
          <li><strong>Termín</strong> — datum splnění</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Barevné indikátory</h2>
        <p className="text-gray-700">
          Pokud si AI není jistá, pole se zvýrazní:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><span className="inline-block w-3 h-3 bg-red-400 rounded mr-1"></span> <strong>Červená</strong> — AI hodně tipuje, zkontroluj.</li>
          <li><span className="inline-block w-3 h-3 bg-amber-300 rounded mr-1"></span> <strong>Žlutá</strong> — AI si není úplně jistá.</li>
          <li>Bez zvýraznění — AI je si jistá, většinou správně.</li>
        </ul>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm">
        Hlasový vstup vyžaduje připojení k internetu — funguje přes AI v cloudu.
      </div>
    </div>
  );
}
