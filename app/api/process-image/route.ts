import { NextRequest, NextResponse } from "next/server";
import { sign, getDateTimeNow } from "./auth";
import { createHash } from "node:crypto";

const DEFAULT_PROMPT =
  "精修这张照片，让照片人物变年轻，保持原有特征，提升肌肤质感，减少皱纹";
const BASE_URL =
  process.env.VOLCENGINE_BASE_URL ?? "https://visual.volcengineapi.com";
const DEFAULT_VERSION = process.env.VOLCENGINE_VERSION ?? "2022-08-31";
const DEFAULT_REGION = process.env.VOLCENGINE_REGION ?? "cn-north-1";
const DEFAULT_SERVICE = process.env.VOLCENGINE_SERVICE ?? "cv";
const DEFAULT_REQ_KEY = process.env.VOLCENGINE_REQ_KEY ?? "jimeng_t2i_v40";
const USER_AGENT = "voco-nextjs/1.0";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const POLL_INTERVAL_MS = 1000;
const MAX_POLL_ATTEMPTS = 30;

const NETWORK_ERROR_FRAGMENTS = [
  "fetch failed",
  "network",
  "timeout",
  "ECONNRESET",
  "EHOSTUNREACH",
  "UND_ERR_SOCKET",
  "ETIMEDOUT",
];
const RETRYABLE_MESSAGE_FRAGMENTS = [
  "timeout",
  "network",
  "connection",
  "busy",
  "overload",
  "limit",
  "超时",
  "请重试",
  "繁忙",
];

export const runtime = "nodejs";
export const maxDuration = 60;

type SubmitResponse = {
  data?: {
    task_id?: string;
  };
  message: string;
  code: number;
  ResponseMetadata?: {
    Error?: {
      Message?: string;
    };
  };
};

type TaskResult = {
  status?: string;
  message?: string;
  data?: Record<string, unknown>;
};

interface ResolvedConfig {
  baseUrl: string;
  version: string;
  region: string;
  service: string;
  reqKey: string;
  prompt: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export async function POST(request: NextRequest) {
  try {
    const { image } = (await request.json()) as { image?: string };

    if (!image) {
      return NextResponse.json(
        { success: false, error: "缺少图片数据" },
        { status: 400 }
      );
    }

    const normalizedImage = normalizeBase64(image);
    const imageBuffer = Buffer.from(normalizedImage, "base64");

    if (!isValidBase64Payload(normalizedImage, imageBuffer)) {
      return NextResponse.json(
        { success: false, error: "无效的图片编码" },
        { status: 400 }
      );
    }

    if (imageBuffer.byteLength === 0) {
      return NextResponse.json(
        { success: false, error: "图片内容为空" },
        { status: 400 }
      );
    }

    if (imageBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `图片文件不能超过 ${(
            MAX_FILE_SIZE_BYTES /
            (1024 * 1024)
          ).toFixed(1)}MB`,
        },
        { status: 413 }
      );
    }

    const config = resolveConfig();
    const imageUrl = await processImage(normalizedImage, config);

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error("处理图片失败:", error);
    const message = error instanceof Error ? error.message : "处理失败";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

async function processImage(
  imageBase64: string,
  config: ResolvedConfig
): Promise<string> {
  const taskId = await submitTask(imageBase64, config);
  console.log(taskId);

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await delay(POLL_INTERVAL_MS);
    }

    const result = await getTaskResult(taskId, config);
    console.log(result);

    const status = result.data?.status;

    if (status === "done") {
      const imageUrl = extractImageUrl(result?.data, "image/jpeg");
      if (!imageUrl) {
        throw new Error("任务成功但未返回图片数据");
      }
      return imageUrl;
    }

    if (status === "failed") {
      const message = result?.message || "任务处理失败";
      throw new Error(message);
    }

    if (!status || status === "in_queue" || status === "pending") {
      continue;
    }
  }

  throw new Error("任务处理超时，请稍后重试");
}

async function submitTask(
  imageBase64: string,
  config: ResolvedConfig
): Promise<string> {
  const url = buildUrl(
    config.baseUrl,
    "CVSync2AsyncSubmitTask",
    config.version
  );
  const payload = {
    req_key: config.reqKey,
    binary_data_base64: [imageBase64],
    prompt: config.prompt,
  };

  const response = await postVolcengine<SubmitResponse>(url, payload, config);
  console.log(response);

  const taskId = response.data?.task_id;
  if (!taskId) {
    throw new Error("未获取到任务ID");
  }

  return taskId;
}

async function getTaskResult(
  taskId: string,
  config: ResolvedConfig
): Promise<TaskResult> {
  const url = buildUrl(config.baseUrl, "CVSync2AsyncGetResult", config.version);
  const payload = {
    req_key: config.reqKey,
    task_id: taskId,
  };

  const response = await postVolcengine<TaskResult>(url, payload, config);
  console.log(response);

  return response;
}

async function postVolcengine<T>(
  url: URL,
  payload: Record<string, unknown>,
  config: ResolvedConfig
): Promise<T> {
  const body = JSON.stringify(payload);
  const xDate = getDateTimeNow();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
    "X-Date": xDate,
    Host: url.hostname,
  };
  const authorization = sign({
    headers,
    method: "POST",
    query: Object.fromEntries(url.searchParams.entries()),
    pathName: url.pathname,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    serviceName: config.service,
    region: config.region,
    bodySha: createHash("sha256").update(body, "utf8").digest("hex"),
    needSignHeaderKeys: ["host", "x-date"],
  });
  headers["Authorization"] = authorization;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as T) : ({} as T);
  return data;
}

function resolveConfig(): ResolvedConfig {
  const accessKeyId = process.env.VOLCENGINE_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.VOLCENGINE_SECRET_ACCESS_KEY?.trim();

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "缺少火山引擎凭证配置，请设置 VOLCENGINE_ACCESS_KEY_ID 和 VOLCENGINE_SECRET_ACCESS_KEY 环境变量"
    );
  }

  return {
    baseUrl: BASE_URL,
    version: DEFAULT_VERSION,
    region: DEFAULT_REGION,
    service: DEFAULT_SERVICE,
    reqKey: DEFAULT_REQ_KEY,
    prompt: process.env.VOLCENGINE_PROMPT?.trim() || DEFAULT_PROMPT,
    accessKeyId,
    secretAccessKey,
  };
}

function normalizeBase64(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("data:")) {
    const separatorIndex = trimmed.indexOf("base64,");
    if (separatorIndex !== -1) {
      return trimmed.slice(separatorIndex + 7).replace(/\s+/g, "");
    }
  }
  return trimmed.replace(/\s+/g, "");
}

function isValidBase64Payload(source: string, buffer: Buffer): boolean {
  if (!source || source.length === 0) {
    return false;
  }

  const sanitizedSource = source.replace(/=+$/, "");
  const reEncoded = buffer.toString("base64").replace(/=+$/, "");
  return sanitizedSource === reEncoded;
}

function extractImageUrl(data: unknown, fallbackMime: string): string | null {
  if (!data) {
    return null;
  }

  if (typeof data === "string") {
    return data.startsWith("data:") ? data : buildDataUrl(data, fallbackMime);
  }

  if (typeof data !== "object" || data === null) {
    return null;
  }

  const record = data as Record<string, unknown>;

  const base64Candidates = [
    record.image,
    record.image_base64,
    Array.isArray(record.binary_data_base64)
      ? record.binary_data_base64[0]
      : undefined,
    Array.isArray(record.image_list) ? record.image_list[0] : undefined,
  ].filter(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0
  );

  if (base64Candidates.length > 0) {
    const rawMime = record.mime_type;
    const mimeType =
      typeof rawMime === "string" && rawMime ? rawMime : fallbackMime;
    return buildDataUrl(base64Candidates[0], mimeType);
  }

  const urlCandidates = [
    record.image_url,
    record.imageUrl,
    record.url,
    Array.isArray(record.image_url_list) ? record.image_url_list[0] : undefined,
  ].filter(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0
  );

  return urlCandidates.length > 0 ? urlCandidates[0] : null;
}

function buildDataUrl(base64: string, mimeType: string): string {
  const sanitized = base64.trim();
  if (sanitized.startsWith("data:")) {
    return sanitized;
  }
  return `data:${mimeType || "image/jpeg"};base64,${sanitized.replace(
    /\s+/g,
    ""
  )}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(baseUrl: string, action: string, version: string): URL {
  const url = new URL("/", baseUrl);
  url.searchParams.set("Action", action);
  url.searchParams.set("Version", version);
  return url;
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

function isNetworkError(message: string): boolean {
  const lowered = message.toLowerCase();
  return NETWORK_ERROR_FRAGMENTS.some((fragment) => lowered.includes(fragment));
}

function isRetryableMessage(message?: string): boolean {
  if (!message) {
    return false;
  }
  const lowered = message.toLowerCase();
  return RETRYABLE_MESSAGE_FRAGMENTS.some((fragment) =>
    lowered.includes(fragment)
  );
}
