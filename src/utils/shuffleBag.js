export function createShuffleBag(size) {
  let bag = [...Array(size).keys()];
  let i = 0;
  return {
    next() {
      if (bag.length === 0) return -1;
      if (i === 0) bag.sort(() => Math.random() - 0.5);
      const idx = bag[i++];
      if (i >= bag.length) i = 0;
      return idx;
    },
    reset(n) { bag = [...Array(n).keys()]; i = 0; }
  };
}
