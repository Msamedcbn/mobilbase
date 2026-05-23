"use client";

import { useState } from "react";

type BuybackRow = {
  id: string;
  customerName: string;
  deviceName: string;
  offeredPrice: number;
  agreedPrice: number | null;
  status: "DRAFT" | "APPROVED" | "REJECTED" | "COMPLETED";
};

export function BuybackTableClient({ initialItems }: { initialItems: BuybackRow[] }) {
  const [items, setItems] = useState<BuybackRow[]>(initialItems);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  async function saveRow(item: BuybackRow) {
    setSavingId(item.id);
    setMessage("");

    try {
      const payload = {
        status: item.status,
        agreedPrice: item.agreedPrice ?? null,
      };

      const res = await fetch(`/api/buybacks/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Kayit guncellenemedi");

      setMessage("Kayit guncellendi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kayit guncellenemedi");
    } finally {
      setSavingId(null);
    }
  }

  function updateItem(id: string, patch: Partial<BuybackRow>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <div className="panel overflow-auto">
      {message && <div className="empty-box" style={{ margin: "0.75rem" }}>{message}</div>}
      {items.length === 0 ? (
        <div className="empty-box">Henuz ikinci el kaydi bulunmuyor.</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Musteri</th>
              <th>Cihaz</th>
              <th>Teklif</th>
              <th>Anlasilan</th>
              <th>Durum</th>
              <th>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const disabled = savingId === item.id;
              return (
                <tr key={item.id}>
                  <td>{item.customerName}</td>
                  <td>{item.deviceName}</td>
                  <td>{item.offeredPrice.toFixed(2)} TL</td>
                  <td style={{ minWidth: 140 }}>
                    <input
                      className="field"
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.agreedPrice ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        updateItem(item.id, { agreedPrice: raw === "" ? null : Number(raw) });
                      }}
                    />
                  </td>
                  <td style={{ minWidth: 160 }}>
                    <select
                      className="field"
                      value={item.status}
                      onChange={(e) => updateItem(item.id, { status: e.target.value as BuybackRow["status"] })}
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                      <option value="COMPLETED">COMPLETED</option>
                    </select>
                  </td>
                  <td style={{ minWidth: 120 }}>
                    <button className="primary-btn" disabled={disabled} onClick={() => saveRow(item)}>
                      {disabled ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
