import { Link } from 'react-router-dom';

export default function GuideBoard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Nástěnka (Board)</h1>

      <p className="text-gray-700">
        <Link to="/board" className="text-forest-700 font-medium hover:underline">Board</Link> je hlavní přehled všech úkolů. Úkoly jsou rozdělené do pěti sloupců podle stavu:
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Sloupec</th>
              <th className="text-left px-3 py-2 font-bold">Význam</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr><td className="px-3 py-2 font-medium">Nápad</td><td className="px-3 py-2 text-gray-600">Náměty a nápady, které ještě nejsou zpracované.</td></tr>
            <tr><td className="px-3 py-2 font-medium">Otevřeno</td><td className="px-3 py-2 text-gray-600">Úkoly připravené k řešení.</td></tr>
            <tr><td className="px-3 py-2 font-medium">V řešení</td><td className="px-3 py-2 text-gray-600">Někdo na tom pracuje.</td></tr>
            <tr><td className="px-3 py-2 font-medium">K revizi</td><td className="px-3 py-2 text-gray-600">Hotovo, čeká na kontrolu.</td></tr>
            <tr><td className="px-3 py-2 font-medium">Hotovo</td><td className="px-3 py-2 text-gray-600">Dokončeno a schváleno.</td></tr>
          </tbody>
        </table>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Vytváření úkolů</h2>
        <p className="text-gray-700">
          Nový úkol vytvoříš tlačítkem <strong>„+ Nový úkol"</strong> v hlavičce boardu. Tlačítko <strong>„+"</strong> v záhlaví sloupce vytvoří úkol s předvyplněným stavem daného sloupce.
        </p>
        <p className="text-gray-700">
          Stránka <Link to="/tasks/new" className="text-forest-700 font-medium hover:underline">Nový úkol</Link> má dvě záložky:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Jeden úkol</strong> — klasický formulář pro jeden úkol.</li>
          <li><strong>Hromadný import</strong> — vlož text nebo tabulku, AI je rozparsuje na úkoly. Výsledek si před uložením zkontroluj v editovatelné tabulce.</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Přesouvání úkolů</h2>
        <p className="text-gray-700">
          Na počítači přetáhni kartičku myší z jednoho sloupce do druhého. Na mobilu podrž prst na kartičce a přetáhni ji.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Detail úkolu</h2>
        <p className="text-gray-700">
          Klikni na kartičku — otevře se detail. Tady můžeš upravit název, popis, kategorii, prioritu a termín.
        </p>
        <p className="text-gray-700">
          Tlačítkem <strong>„Vezmu si to"</strong> si úkol přiřadíš. Ostatní uvidí, že na něm pracuješ.
        </p>
        <p className="text-gray-700">
          V detailu můžeš také přidávat a spravovat <strong>podúkoly (subtasky)</strong> — rozděl si práci na menší kroky.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Mazání</h2>
        <p className="text-gray-700">
          V detailu úkolu najdeš tlačítko <strong>„Smazat úkol"</strong>. Smazání je nevratné — smažou se i všechny subtasky a komentáře.
        </p>
      </div>
    </div>
  );
}
