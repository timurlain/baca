import { Link } from 'react-router-dom';
import { useAuthContext } from '@/App';
import { UserRole } from '@/types';

export default function GuideWelcome() {
  const { user } = useAuthContext();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Příručka</h1>

      <p className="text-gray-700 text-base leading-relaxed">
        Bača ti pomáhá organizovat Ovčinu. Všechny úkoly na jednom místě — přehledně, rychle, i bez signálu.
      </p>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Jak začít</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Otevři <Link to="/board" className="text-forest-700 font-medium hover:underline">Board</Link> a prohlédni si úkoly rozdělené do sloupců.</li>
          <li>Klikni na úkol a stiskni <strong>„Vezmu si to"</strong> — úkol se ti přiřadí.</li>
          <li>Na stránce <Link to="/" className="text-forest-700 font-medium hover:underline">Můj fokus</Link> uvidíš svoje nejdůležitější úkoly. Splněné označ <strong>„Hotovo"</strong>.</li>
        </ol>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">Témata</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TopicCard to="/guide/board" title="Nástěnka (Board)" desc="Sloupce, přesouvání, přiřazení" />
          <TopicCard to="/guide/focus" title="Můj fokus" desc="Tvoje úkoly, tlačítka Hotovo a K review" />
          <TopicCard to="/guide/voice" title="Hlasový vstup" desc="Zadej úkol hlasem" />
          {user?.role === UserRole.Admin && (
            <TopicCard to="/guide/admin" title="Správa" desc="Uživatelé, kategorie, PIN" />
          )}
          <TopicCard to="/guide/offline" title="Offline režim" desc="Co funguje bez signálu" />
        </div>
      </div>
    </div>
  );
}

function TopicCard({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="block p-4 border border-gray-200 rounded-xl hover:border-forest-600 hover:bg-forest-50 transition-colors"
    >
      <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
      <p className="text-gray-500 text-xs mt-1">{desc}</p>
    </Link>
  );
}
