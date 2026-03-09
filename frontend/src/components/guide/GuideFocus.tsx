import { Link } from 'react-router-dom';

export default function GuideFocus() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Můj fokus</h1>

      <p className="text-gray-700">
        <Link to="/" className="text-forest-700 font-medium hover:underline">Můj fokus</Link> zobrazuje tvoje nejdůležitější úkoly — ty, které máš přiřazené a jsou ve stavu <strong>Otevřeno</strong> nebo <strong>V řešení</strong>.
      </p>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Co tady uvidíš</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Kartičky tvých úkolů seřazené podle priority (vysoká nahoře).</li>
          <li>Barevný proužek vlevo ukazuje prioritu: <span className="text-red-600 font-medium">červená</span> = vysoká, <span className="text-blue-500 font-medium">modrá</span> = střední, <span className="text-gray-400 font-medium">šedá</span> = nízká.</li>
          <li>Kategorie a termín, pokud jsou nastavené.</li>
          <li>Progres subtasků (pokud úkol má podúkoly).</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Dvě akce</h2>
        <p className="text-gray-700">Pod každou kartičkou jsou dvě tlačítka:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>✓ Hotovo</strong> — přesune úkol do sloupce Hotovo.</li>
          <li><strong>→ K review</strong> — přesune úkol do sloupce K revizi. Použij, když potřebuješ, aby to někdo zkontroloval.</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Všechno splněno?</h2>
        <p className="text-gray-700">
          Když nemáš žádné aktivní úkoly, uvidíš zprávu <strong>„Všechno splněno!"</strong> s odkazem na celý board.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm">
        Fokus funguje i offline — viz <Link to="/guide/offline" className="font-medium underline">Offline režim</Link>.
      </div>
    </div>
  );
}
