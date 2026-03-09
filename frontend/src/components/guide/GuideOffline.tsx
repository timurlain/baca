export default function GuideOffline() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Offline režim</h1>

      <p className="text-gray-700">
        Na Ovčině nemusí být všude signál. Bača umí pracovat i bez internetu — některé funkce běží lokálně na tvém telefonu.
      </p>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Co funguje offline</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Můj fokus</strong> — prohlížení tvých úkolů (z mezipaměti).</li>
          <li><strong>Hotovo / K review</strong> — změny se uloží a odešlou, až budeš online.</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Co vyžaduje internet</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>Hlasový vstup</strong> — přepis i parsování běží v cloudu.</li>
          <li><strong>Vytváření nových úkolů</strong> — potřebuje backend.</li>
          <li><strong>Board drag-and-drop</strong> — přesouvání karet mezi sloupci.</li>
          <li><strong>Správa</strong> — všechny admin operace.</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Jak to poznáš</h2>
        <p className="text-gray-700">
          Když jsi offline, nahoře se zobrazí lišta: <strong>„Offline režim — změny se synchronizují po připojení"</strong>. Jakmile se připojíš, uložené změny se automaticky odešlou.
        </p>
      </div>
    </div>
  );
}
