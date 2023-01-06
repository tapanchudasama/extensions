import { OAuth } from "@raycast/api";
import fetch from "node-fetch";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Batchelor from "batchelor";

export type MailResponseType = {
  id: string;
  subject: string;
  from: string;
  date: string;
};

// Create an OAuth client ID via http`s`://console.developers.google.com/apis/credentials
// As application type choose "iOS" (required for PKCE)
// As Bundle ID enter: com.raycast
const clientId = "135209116087-i59si6j7bvrpcuraerqcmopv312d8mce.apps.googleusercontent.com";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google",
  providerIcon: "google-logo.png",
  providerId: "google",
  description: "Connect your Google account",
});

// Authorization

export async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      await client.setTokens(await refreshTokens(tokenSet.refreshToken));
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: clientId,
    scope:
      "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/gmail.readonly",
  });

  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("code", authCode);
  params.append("verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: params });

  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return (await response.json()) as OAuth.TokenResponse;
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body: params });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

// API

export async function fetchItems(): Promise<MailResponseType[]> {
  const params = new URLSearchParams();
  const tokenSet = await client.getTokens();
  params.append("labelIds", "CATEGORY_PERSONAL");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?" + params.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
    },
  });

  if (!response.ok) {
    console.error("fetch items error:", await response.text());
    throw new Error(response.statusText);
  }
  const json = (await response.json()) as { messages: { id: string; threadId: string }[]; nextPageToken: string };

  const batch = new Batchelor({
    // Any batch uri endpoint in the form: https://www.googleapis.com/batch/<api>/<version>
    uri: "https://www.googleapis.com/batch/gmail/v1/",
    method: "POST",
    auth: {
      bearer: `${tokenSet?.accessToken}`,
    },
    headers: {
      "Content-Type": "multipart/mixed",
    },
  });

  const arr: { method: string; path: string }[] = [];

  json.messages.forEach((j) => {
    arr.push({
      method: "GET",
      path: `/gmail/v1/users/me/messages/${j.id}?format=metadata`,
    });
  });

  let res = [];

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return new Promise((resolve, reject) => {
    batch.add(arr).run(function (err, response) {
      if (err) {
        reject(err.toString());
      } else {
        res = response.parts.map((r: { body: any }) => {
          return {
            id: r.body.id,
            subject: r.body.payload.headers.find((h: any) => h.name === "Subject")?.value as string,
            from: r.body.payload.headers.find((h: any) => h.name === "From")?.value as string,
            date: r.body.payload.headers.find((h: any) => h.name === "Date")?.value as string,
          };
        });
        return resolve(res);
      }
    });
  })
}

// async function fetchItemInfo(id: string): Promise<MailResponseType> {
//   const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${(await client.getTokens())?.accessToken}`,
//     },
//   });

//   if (!res.ok) {
//     console.error("fetch items error:", await res.text());
//     throw new Error(res.statusText);
//   }

//   const json = (await res.json()) as {
//     id: string;
//     payload: {
//       partId: string;
//       mimetype: string;
//       body: {
//         data: string;
//       };
//       headers: { name: string; value: string }[];
//     };
//   };

//   return {
//     id: json.id,
//     subject: json.payload.headers.find((h) => h.name === "Subject")?.value as string,
//     from: json.payload.headers.find((h) => h.name === "From")?.value as string,
//     date: json.payload.headers.find((h) => h.name === "Date")?.value as string,
//   };
// }
