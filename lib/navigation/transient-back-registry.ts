export interface TransientBackEntry {
  id: string;
  priority: number;
  close: () => void;
}

export class TransientBackRegistry {
  private entries: Array<TransientBackEntry & { order: number }> = [];
  private order = 0;

  register(entry: TransientBackEntry): () => void {
    this.unregister(entry.id);
    const registered = { ...entry, order: this.order++ };
    this.entries.push(registered);
    return () => this.unregister(entry.id);
  }

  unregister(id: string): boolean {
    const index = this.entries.findIndex((entry) => entry.id === id);
    if (index < 0) return false;
    this.entries.splice(index, 1);
    return true;
  }

  closeTop(): boolean {
    if (!this.entries.length) return false;
    const top = this.entries.reduce((selected, entry) =>
      entry.priority > selected.priority ||
      (entry.priority === selected.priority && entry.order > selected.order)
        ? entry
        : selected
    );
    this.unregister(top.id);
    top.close();
    return true;
  }
}
