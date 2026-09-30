import { resolve4, resolve6 } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest, type IncomingMessage, type RequestOptions as HttpRequestOptions } from "node:http";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import ipaddr from "ipaddr.js";

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

interface SafeFetchOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  httpsOnly?: boolean;
  validateRedirect?: (url: URL) => void;
}

function normalizedHostname(url: URL) {
  return url.hostname.replace(/^\[|\]$/g, "");
}

export function isRestrictedAddress(address: string) {
  try {
    const normalized = address.split("%")[0];
    const parsed = ipaddr.parse(normalized);
    if (ipaddr.IPv6.isIPv6(normalized)) {
      const ipv6 = ipaddr.IPv6.parse(normalized);
      if (ipv6.isIPv4MappedAddress()) return ipv6.toIPv4Address().range() !== "unicast";
    }
    return parsed.range() !== "unicast";
  } catch {
    return true;
  }
}

async function resolvePublicAddresses(url: URL): Promise<ResolvedAddress[]> {
  const hostname = normalizedHostname(url);
  const family = isIP(hostname);
  let addresses: ResolvedAddress[];
  if (family === 4 || family === 6) {
    addresses = [{ address: hostname, family }];
  } else {
    const [ipv4, ipv6] = await Promise.all([
      resolve4(hostname).catch(() => []),
      resolve6(hostname).catch(() => []),
    ]);
    addresses = [
      ...ipv4.map((address) => ({ address, family: 4 as const })),
      ...ipv6.map((address) => ({ address, family: 6 as const })),
    ];
  }

  if (addresses.length === 0 || addresses.some(({ address }) => isRestrictedAddress(address))) {
    throw new Error("Endereço não permitido");
  }
  return addresses;
}

function validateUrl(url: URL, httpsOnly: boolean) {
  const protocols = httpsOnly ? ["https:"] : ["http:", "https:"];
  const hostname = normalizedHostname(url);
  if (!protocols.includes(url.protocol) || url.username || url.password || !hostname || hostname.endsWith(".local")) {
    throw new Error(httpsOnly ? "Use uma URL HTTPS válida" : "Use uma URL HTTP ou HTTPS válida");
  }
}

export async function validateRemoteUrl(value: string, httpsOnly = true) {
  const url = new URL(value);
  validateUrl(url, httpsOnly);
  await resolvePublicAddresses(url);
  return url;
}

function makeResponse(message: IncomingMessage) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(message.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  const status = message.statusCode || 502;
  const body = status === 204 || status === 304
    ? null
    : Readable.toWeb(message) as ReadableStream<Uint8Array>;
  return new Response(body, { status, statusText: message.statusMessage, headers });
}

async function requestPinned(url: URL, addresses: ResolvedAddress[], options: SafeFetchOptions) {
  const selected = addresses[0];
  const lookup: NonNullable<HttpRequestOptions["lookup"]> = (_hostname, lookupOptions, callback) => {
    const record = { address: selected.address, family: selected.family };
    if (lookupOptions.all) callback(null, [record]);
    else callback(null, record.address, record.family);
  };
  const requestOptions = {
    headers: { "accept-encoding": "identity", ...options.headers },
    lookup,
    signal: options.signal,
    servername: isIP(normalizedHostname(url)) ? undefined : normalizedHostname(url),
  };

  return new Promise<IncomingMessage>((resolve, reject) => {
    const request = url.protocol === "https:"
      ? httpsRequest(url, requestOptions, resolve)
      : httpRequest(url, requestOptions, resolve);
    request.once("error", reject);
    request.end();
  });
}

export async function fetchValidatedRemote(value: string | URL, options: SafeFetchOptions = {}) {
  const httpsOnly = options.httpsOnly ?? false;
  let url = new URL(value.toString());

  for (let redirect = 0; redirect <= 3; redirect += 1) {
    validateUrl(url, httpsOnly);
    options.validateRedirect?.(url);
    const addresses = await resolvePublicAddresses(url);
    const message = await requestPinned(url, addresses, options);
    const status = message.statusCode || 502;

    if (status >= 300 && status < 400) {
      const location = message.headers.location;
      message.destroy();
      if (!location || redirect === 3) throw new Error("Redirecionamentos demais");
      url = new URL(location, url);
      continue;
    }

    const response = makeResponse(message);
    Object.defineProperty(response, "url", { value: url.href });
    return response;
  }

  throw new Error("Redirecionamentos demais");
}

export async function readResponseBuffer(response: Response, maximumBytes: number) {
  if (!response.body) throw new Error("Resposta sem conteúdo");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new Error("A resposta ultrapassa o tamanho máximo permitido");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalBytes);
}
