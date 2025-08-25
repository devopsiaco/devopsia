function promptModeDropdown() {
  return {
    open: false,
    value: 'secure',
    activeIndex: 0,
    options: [
      { value: 'secure',    label: 'Secure',    badge: 'Hardened', desc: 'Defense-in-depth prompts, injection-resistant' },
      { value: 'optimized', label: 'Optimized', badge: 'Balanced',  desc: 'Best quality vs. speed for most tasks' },
      { value: 'fast',      label: 'Fast',      badge: 'Lite',      desc: 'Lower cost & latency, concise outputs' },
    ],
    init() {
      const saved = localStorage.getItem('devopsia:promptMode');
      if (saved && this.options.some(o => o.value === saved)) this.value = saved;
      this.emit();
      this.activeIndex = this.options.findIndex(o => o.value === this.value) || 0;
      this.$watch('open', (v) => {
        if (v) queueMicrotask(() => {
          const el = document.getElementById('mode-opt-' + this.activeIndex);
          el?.focus();
        });
      });
      document.addEventListener('promptMode:get', () => this.emit());
    },
    toggle() { this.open = !this.open; },
    openAndMove(dir) {
      if (!this.open) { this.open = true; return; }
      this.move(dir);
    },
    openAndSelect() {
      if (!this.open) { this.open = true; return; }
      this.select(this.activeIndex);
    },
    move(delta) {
      const max = this.options.length - 1;
      let next = this.activeIndex + delta;
      if (next < 0) next = max;
      if (next > max) next = 0;
      this.activeIndex = next;
      queueMicrotask(() => document.getElementById('mode-opt-' + this.activeIndex)?.focus());
    },
    select(idx) {
      const opt = this.options[idx];
      if (!opt) return;
      this.value = opt.value;
      localStorage.setItem('devopsia:promptMode', this.value);
      this.emit();
      this.open = false;
    },
    labelFor(v) {
      const o = this.options.find(o => o.value === v);
      return o ? o.label : 'Mode';
    },
    emit() {
      const input = document.getElementById('prompt-mode');
      if (input) input.value = this.value;
      document.dispatchEvent(new CustomEvent('promptMode:change', { detail: { mode: this.value } }));
    },
    iconFor(v) {
      const base = 'class="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24"';
      switch (v) {
        case 'secure':
          return `<svg ${base} aria-hidden="true"><path d="M12 2l7 4v6c0 5-3.4 9.7-7 10-3.6-.3-7-5-7-10V6l7-4zm0 6a3 3 0 013 3v2a3 3 0 01-6 0v-2a3 3 0 013-3z"/></svg>`;
        case 'optimized':
          return `<svg ${base} aria-hidden="true"><path d="M3 12h6l3-9 3 18 3-9h3"/><circle cx="3" cy="12" r="1.5"/><circle cx="21" cy="12" r="1.5"/></svg>`;
        case 'fast':
          return `<svg ${base} aria-hidden="true"><path d="M2 13h10l-4 8 14-12H10l4-8L2 13z"/></svg>`;
        default:
          return `<svg ${base} aria-hidden="true"><circle cx="12" cy="12" r="6"/></svg>`;
      }
    }
  }
}
