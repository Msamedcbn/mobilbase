import Link from "next/link";

/**
 * Mobile home launcher — dark icon tiles in a 4-up grid, the way a phone app
 * surfaces its modules. Desktop keeps the sidebar, so this is md:hidden.
 */

type Tile = { href: string; label: string; color: string; path: string; external?: boolean };

const TILES: Tile[] = [
  { href: "/toptan-alim-satis", label: "Alis", color: "text-rose-400", path: "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437m0 0L6.75 14.25a2.25 2.25 0 002.25 1.5h9.157c1.052 0 1.945-.75 2.157-1.775l1.5-7.5A1.125 1.125 0 0020.625 4.5H5.106M6.75 14.25L5.106 4.5M6.75 14.25L5.25 18h13.5M9 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm9 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" },
  { href: "/pos", label: "Satis", color: "text-emerald-400", path: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { href: "/stok", label: "Stok", color: "text-blue-400", path: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { href: "/tamir-takip", label: "Teknik Servis", color: "text-amber-400", path: "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.276a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" },

  { href: "/giderler", label: "Gelir/Gider", color: "text-fuchsia-400", path: "M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" },
  { href: "/uyarilar", label: "Yapilacak Isler", color: "text-sky-400", path: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/seri-no-takip", label: "IMEI Takibi", color: "text-red-400", path: "M7 7h.01M7 11h.01M7 15h.01M13 7h.01M13 11h.01M13 15h.01M17 7h.01M17 11h.01M17 15h.01M3 21h18M3 3h18v18H3V3z" },
  { href: "/kurumsal-teklifler", label: "Teklifler", color: "text-orange-400", path: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },

  { href: "/taksit-yonetimi", label: "Taksitler", color: "text-indigo-400", path: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/buyback/backoffice", label: "Cihaz Alimi", color: "text-teal-400", path: "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2zM12 7v6m0 0l-2-2m2 2l2-2" },
  { href: "/musteriler-veresiye", label: "Musteriler", color: "text-lime-400", path: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m16-10a4 4 0 11-8 0 4 4 0 018 0z" },
  { href: "/banka", label: "Kasa & Banka", color: "text-violet-400", path: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },

  { href: "/personel-yonetimi", label: "Calisanlar", color: "text-cyan-400", path: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" },
  { href: "/subeler", label: "Subeler", color: "text-green-400", path: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/veri-analizi", label: "P&L Analiz", color: "text-blue-300", path: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
  { href: "/ayarlar/abonelik", label: "Aboneligim", color: "text-yellow-400", path: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
];

export function MobileQuickGrid() {
  return (
    <div className="grid grid-cols-4 gap-x-3 gap-y-4 md:hidden">
      {TILES.map((tile) => {
        const inner = (
          <>
            <span className="flex aspect-square w-full items-center justify-center rounded-2xl bg-[#1c1c1e] shadow-sm transition active:scale-95">
              <svg className={`h-6 w-6 ${tile.color}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={tile.path} />
              </svg>
            </span>
            <span className="mt-1.5 block text-center text-[10px] font-semibold leading-tight text-slate-600">
              {tile.label}
            </span>
          </>
        );

        return tile.external ? (
          <a key={tile.href} href={tile.href} target="_blank" rel="noopener noreferrer" className="block">
            {inner}
          </a>
        ) : (
          <Link key={tile.href} href={tile.href} className="block">
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
