/**
 * Supabase/PostgREST gibt standardmäßig maximal 1000 Zeilen zurück.
 * Diese Funktion lädt alle Zeilen in Blöcken von PAGE_SIZE, bis keine mehr kommen.
 *
 * Aufruf:
 *   const { data, error } = await fetchAllRows((from, to) =>
 *     supabase.from("games").select("*").range(from, to)
 *   );
 */
export const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  queryFn: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>
): Promise<{ data: T[]; error: string | null }> {
  const all: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await queryFn(from, from + PAGE_SIZE - 1);

    if (error) return { data: [], error: error.message };

    all.push(...(data ?? []));

    // Wenn weniger als PAGE_SIZE Zeilen zurückkamen, sind wir fertig.
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }

  return { data: all, error: null };
}
