import { useCallback, useEffect, useState } from "react";

export type CartLine = { id: string; label: string; price: number; qty: number };

const keyFor = (projectId: string) => `site-cart:${projectId}`;

function read(projectId: string): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(keyFor(projectId));
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.id === "string") : [];
  } catch {
    return [];
  }
}

const EVENT = "site-cart-change";

/** Visitor cart for a generated customer-facing website (per project, local to the browser). */
export function useCart(projectId: string) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    setLines(read(projectId));
    const sync = () => setLines(read(projectId));
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [projectId]);

  const persist = useCallback(
    (next: CartLine[]) => {
      window.localStorage.setItem(keyFor(projectId), JSON.stringify(next));
      window.dispatchEvent(new Event(EVENT));
      setLines(next);
    },
    [projectId],
  );

  const add = useCallback(
    (line: Omit<CartLine, "qty">, qty = 1) => {
      const current = read(projectId);
      const found = current.find((l) => l.id === line.id);
      const next = found
        ? current.map((l) => (l.id === line.id ? { ...l, qty: l.qty + qty } : l))
        : [...current, { ...line, qty }];
      persist(next);
    },
    [persist, projectId],
  );

  const setQty = useCallback(
    (id: string, qty: number) => {
      const next = read(projectId)
        .map((l) => (l.id === id ? { ...l, qty: Math.max(0, qty) } : l))
        .filter((l) => l.qty > 0);
      persist(next);
    },
    [persist, projectId],
  );

  const remove = useCallback((id: string) => setQty(id, 0), [setQty]);
  const clear = useCallback(() => persist([]), [persist]);

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.price, 0);

  return { lines, add, setQty, remove, clear, count, total };
}
