/**
 * Recorre el DOM renderizado y extrae los nodos de texto no vacíos, en el
 * mismo orden y con el mismo criterio (trim + descartar vacíos) que
 * tests/extract_frontend_values.py aplica sobre el HTML del
 * vanilla JS. La comparación entre ambos exige que cada elemento con texto
 * interpolado use un único template string como hijo (ver KpiCards.tsx) --
 * si React fragmenta el texto en varios nodos, la lista deja de casar
 * aunque el contenido visible sea idéntico.
 */
export function extractVisibleText(container: HTMLElement): string[] {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const chunks: string[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim() ?? '';
    if (text) chunks.push(text);
  }
  return chunks;
}
