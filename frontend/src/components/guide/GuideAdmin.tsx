export default function GuideAdmin() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Správa</h1>

      <p className="text-gray-700">
        Sekce <strong>Admin</strong> je dostupná jen pro administrátory. Najdeš tu správu uživatelů, kategorií, herních rolí a nastavení aplikace.
      </p>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Uživatelé</h2>
        <p className="text-gray-700">
          V sekci <strong>Správa uživatelů</strong> můžeš:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Přidat nového organizátora — vyplň jméno, email a volitelně telefon.</li>
          <li>Zvolit roli: <strong>Admin</strong> (plný přístup) nebo <strong>Uživatel</strong> (organizátor bez správy).</li>
          <li>Tlačítkem <strong>„Odeslat odkaz"</strong> pošleš přihlašovací link na email.</li>
          <li>Deaktivovat uživatele, který už nepotřebuje přístup.</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Kategorie</h2>
        <p className="text-gray-700">
          Kategorie pomáhají třídit úkoly (např. Hra, Logistika, Jídlo). V <strong>Správa kategorií</strong> můžeš:
        </p>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li>Přidat novou kategorii s názvem a barvou.</li>
          <li>Upravit existující kategorie.</li>
          <li>Smazat kategorii (pouze pokud nemá přiřazené úkoly).</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Guest PIN</h2>
        <p className="text-gray-700">
          V <strong>Nastavení</strong> můžeš změnit PIN, kterým se hosté (rodiče) přihlašují do read-only režimu. Sdílej PIN jen s lidmi, kteří mají mít přístup.
        </p>
      </div>
    </div>
  );
}
