import { defineStore } from 'pinia';

const VAT_RATE = 0.1;

export const useDraftStore = defineStore('draft', {
  state: () => ({ quoteNo: '', recipient: '', title: '', lines: [] }),
  getters: {
    supplyTotal: (s) => s.lines.reduce((sum, l) => sum + l.price * l.qty, 0),
    vat() {
      return Math.floor(this.supplyTotal * VAT_RATE);
    },
    grandTotal() {
      return this.supplyTotal + this.vat;
    },
  },
  actions: {
    // 같은 아이템 넘버가 이미 있으면 수량을 합산한다.
    add(item, qty) {
      const found = this.lines.find((l) => l.itemNo === item.itemNo);
      if (found) found.qty += qty;
      else this.lines.push({ ...item, qty });
    },
    remove(itemNo) {
      this.lines = this.lines.filter((l) => l.itemNo !== itemNo);
    },
    clear() {
      this.quoteNo = '';
      this.recipient = '';
      this.title = '';
      this.lines = [];
    },
  },
});
