import { describeLocalStoreContract } from './localStoreContract';
import { createMemoryLocalStore } from './memoryLocalStore';

describeLocalStoreContract('memoria', async () => {
  let now = 0;
  return {
    store: createMemoryLocalStore(() => now),
    setNow: (ms) => {
      now = ms;
    },
  };
});
