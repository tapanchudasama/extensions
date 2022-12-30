import { useEffect, useState } from "react";
import { Cache } from "@raycast/api";
import * as google from "./oauth/google";
import { MailResponseType } from "./oauth/google";

const cache = new Cache();
// The HNRSS service caches responses for 5 minutes: https://github.com/hnrss/hnrss/issues/71
const CACHE_DURATION = 300000;
type CacheEntry = { timestamp: number; items: MailResponseType[] };

interface State {
  isLoading: boolean;
  items: MailResponseType[];
  error: Error | null;
}

export const useMail = (): [MailResponseType[], boolean, Error | null] => {
  const [state, setState] = useState<State>({ items: [], isLoading: true, error: null });

  useEffect(() => {
    async function fetchStories() {
      const cachedResponse = cache.get("mails");
      cache.clear();

      if (cachedResponse) {
        try {
          const parsed: CacheEntry = JSON.parse(cachedResponse);
          const elapsed = Date.now() - parsed.timestamp;
          console.log(`cache age: ${elapsed / 1000} seconds`);
          if (elapsed <= CACHE_DURATION) {
            setState((previous) => ({ ...previous, items: parsed.items, isLoading: false }));
            return;
          }
        } catch (e) {
          // nothing to do
        }
      }

      setState((previous) => ({ ...previous, isLoading: true }));
      try {
        await google.authorize();
        const mails = await google.fetchItems();
        setState((previous) => ({ ...previous, items: [...previous.items, ...mails], isLoading: false }));
        cache.set("mails", JSON.stringify({ timestamp: Date.now(), items: mails }));
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error : new Error("Something went wrong"),
          isLoading: false,
          items: [],
        }));
      }
    }

    fetchStories();
  }, []);

  return [state.items, state.isLoading, state.error];
};
