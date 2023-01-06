import { useEffect, useState } from "react";
import { Action, ActionPanel, List, Icon, showToast, Toast, Color } from "@raycast/api";
import { MailResponseType } from "./oauth/google";
import { useMail } from "./useMail";

export default function Command() {
  // const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState<MailResponseType[]>([]);
  // const [list, setList] = useState<MailResponseType[]>([]);
  const [list, loading, error] = useMail();

  useEffect(() => {
    filterList(list);
  }, [list]);

  useEffect(() => {
    if (searchText === "") {
      filterList(list);
      return;
    }
    filterList(list.filter((item) => item.subject.includes(searchText) || item.from.includes(searchText)));
  }, [searchText]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List
      //   isShowingDetail
      isLoading={loading}
      filtering={false}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Mail"
      searchBarPlaceholder="Search your inbox"
    >
      {error && <List.EmptyView icon={Icon.ExclamationMark} title="Something went wrong" />}
      {filteredList.length == 0 && <List.EmptyView icon={Icon.Envelope} title="Your Inbox is empty" />}
      {filteredList.map((item) => (
        <List.Item
          key={item.id}
          title={item.subject}
          //   icon={Icon.Envelope}
          accessories={[
            { tag: { value: item.from, color: Color.Yellow } },
            { tag: { value: new Date(item.date), color: Color.Blue } },
            // { tag: { value: "User", color: Color.Magenta }, tooltip: "Tag with tooltip" },
          ]}
          //   detail={<List.Item.Detail markdown={atob(item.payload.body.data)} />}
          actions={
            <ActionPanel title="Open in Browser">
              <Action.OpenInBrowser url={`https://mail.google.com/mail/u/0/#inbox/${item.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
