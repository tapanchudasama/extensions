import { useEffect, useState } from "react";
import { Cache } from "@raycast/api";
import * as google from "./oauth/google";
import { MailResponseType } from "./oauth/google";

export const cache = new Cache();

interface State {
  isLoading: boolean;
  items: MailResponseType[];
  error: Error | null;
}

export const useMail = (): [MailResponseType[], boolean, Error | null] => {
  const [state, setState] = useState<State>({ items: [], isLoading: true, error: null });

  useEffect(() => {
    async function fetchStories() {
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
