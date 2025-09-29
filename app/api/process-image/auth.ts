"use strict";

import crypto from "crypto";

/**
 * 不参与加签过程的 header key
 */
const HEADER_KEYS_TO_IGNORE = new Set([
  "authorization",
  "content-type",
  "content-length",
  "user-agent",
  "presigned-expires",
  "expect",
]);

export function sign(params: any) {
  const {
    headers = {},
    query = {},
    region = "",
    serviceName = "",
    method = "",
    pathName = "/",
    accessKeyId = "",
    secretAccessKey = "",
    needSignHeaderKeys = [],
    bodySha,
  } = params;
  const datetime = headers["X-Date"];
  const date = datetime.substring(0, 8); // YYYYMMDD
  // 创建正规化请求
  const [signedHeaders, canonicalHeaders] = getSignHeaders(
    headers,
    needSignHeaderKeys
  );
  const canonicalRequest = [
    method.toUpperCase(),
    pathName,
    queryParamsToString(query) || "",
    `${canonicalHeaders}\n`,
    signedHeaders,
    bodySha || hash(""),
  ].join("\n");
  const credentialScope = [date, region, serviceName, "request"].join("/");
  // 创建签名字符串
  const stringToSign = [
    "HMAC-SHA256",
    datetime,
    credentialScope,
    hash(canonicalRequest),
  ].join("\n");
  // 计算签名
  const kDate = hmac(secretAccessKey, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  return [
    "HMAC-SHA256",
    `Credential=${accessKeyId}/${credentialScope},`,
    `SignedHeaders=${signedHeaders},`,
    `Signature=${signature}`,
  ].join(" ");
}

function hmac(secret: any, s: any) {
  return crypto.createHmac("sha256", secret).update(s, "utf8").digest();
}

function hash(s: any) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function queryParamsToString(params: any) {
  return Object.keys(params)
    .sort()
    .map((key) => {
      const val = params[key];
      if (typeof val === "undefined" || val === null) {
        return undefined;
      }
      const escapedKey = uriEscape(key);
      if (!escapedKey) {
        return undefined;
      }
      if (Array.isArray(val)) {
        return `${escapedKey}=${val
          .map(uriEscape)
          .sort()
          .join(`&${escapedKey}=`)}`;
      }
      return `${escapedKey}=${uriEscape(val)}`;
    })
    .filter((v) => v)
    .join("&");
}

function getSignHeaders(originHeaders: any, needSignHeaders: any) {
  function trimHeaderValue(header: any) {
    return header.toString?.().trim().replace(/\s+/g, " ") ?? "";
  }

  let h = Object.keys(originHeaders);
  // 根据 needSignHeaders 过滤
  if (Array.isArray(needSignHeaders)) {
    const needSignSet = new Set(
      [...needSignHeaders, "x-date", "host"].map((k) => k.toLowerCase())
    );
    h = h.filter((k) => needSignSet.has(k.toLowerCase()));
  }
  // 根据 ignore headers 过滤
  h = h.filter((k) => !HEADER_KEYS_TO_IGNORE.has(k.toLowerCase()));
  const signedHeaderKeys = h
    .slice()
    .map((k) => k.toLowerCase())
    .sort()
    .join(";");
  const canonicalHeaders = h
    .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
    .map((k) => `${k.toLowerCase()}:${trimHeaderValue(originHeaders[k])}`)
    .join("\n");
  return [signedHeaderKeys, canonicalHeaders];
}

function uriEscape(str: string) {
  try {
    return encodeURIComponent(str)
      .replace(/[^A-Za-z0-9_.~\-%]+/g, escape)
      .replace(
        /[*]/g,
        (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
      );
  } catch (e) {
    return "";
  }
}

export function getDateTimeNow() {
  const now = new Date();
  return now.toISOString().replace(/[:-]|\.\d{3}/g, "");
}
