export function autoScroll(node: HTMLElement) {
  return {
    update() {
      const target = node.scrollHeight - node.clientHeight;
      const current = node.scrollTop;
      const diff = target - current;

      if (diff > 300) return;
      if (diff <= 1) {
        node.scrollTop = target;
        return;
      }

      const factor = window.innerWidth <= 768 ? 0.4 : 0.2;
      node.scrollTop = current + diff * factor;
    }
  };
}
