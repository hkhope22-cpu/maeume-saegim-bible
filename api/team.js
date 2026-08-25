import { get as getBlob, list, put } from "@vercel/blob";
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

const ACCESS = "private";
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const TEAM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const JSON_OPTIONS = {
  access: ACCESS,
  contentType: "application/json; charset=utf-8",
  cacheControlMaxAge: 60,
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  };
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: corsHeaders() });
}

function cleanText(value, maxLength, label) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) throw new HttpError(400, `${label}을(를) 입력해 주세요.`);
  if (text.length > maxLength) throw new HttpError(400, `${label}은(는) ${maxLength}자까지 입력할 수 있어요.`);
  return text;
}

function optionalText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeCode(value) {
  const code = String(value || "").toUpperCase().replace(/[^A-Z2-9]/g, "");
  if (code.length !== 8) throw new HttpError(400, "8자리 그룹 초대코드를 확인해 주세요.");
  return code;
}

function randomCode() {
  const bytes = randomBytes(8);
  return [...bytes].map((byte) => TEAM_CODE_ALPHABET[byte % TEAM_CODE_ALPHABET.length]).join("");
}

function newToken() {
  return randomBytes(24).toString("base64url");
}

function tokenHash(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

function sameHash(left, right) {
  const a = Buffer.from(String(left || ""), "hex");
  const b = Buffer.from(String(right || ""), "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function groupPath(code) {
  return `teams/${code}/group.json`;
}

function memberPath(code, memberId) {
  return `teams/${code}/members/${memberId}.json`;
}

function certificationPath(code, date, certificationId) {
  return `teams/${code}/certifications/${date}/${Date.now()}-${certificationId}.json`;
}

async function readJson(pathname, useCache = false) {
  const result = await getBlob(pathname, { access: ACCESS, useCache });
  if (!result?.stream || result.statusCode === 304) return null;
  const text = await new Response(result.stream).text();
  return { data: JSON.parse(text), etag: result.blob.etag };
}

async function writeJson(pathname, value, options = {}) {
  return put(pathname, JSON.stringify(value), {
    ...JSON_OPTIONS,
    allowOverwrite: Boolean(options.allowOverwrite),
    ...(options.ifMatch ? { ifMatch: options.ifMatch } : {}),
  });
}

async function listJson(prefix, limit = 1000) {
  const result = await list({ prefix, limit });
  return Promise.all(result.blobs.map(async (blob) => {
    try {
      return (await readJson(blob.pathname))?.data || null;
    } catch {
      return null;
    }
  })).then((items) => items.filter(Boolean));
}

async function requireGroup(code) {
  const group = await readJson(groupPath(code));
  if (!group) throw new HttpError(404, "그룹을 찾지 못했어요. 초대코드를 다시 확인해 주세요.");
  return group;
}

async function requireMember(code, memberId, memberToken) {
  if (!/^[a-f0-9-]{36}$/.test(String(memberId || ""))) throw new HttpError(401, "이 기기의 그룹 참여 정보를 다시 확인해 주세요.");
  const result = await readJson(memberPath(code, memberId));
  const member = result?.data;
  if (!member || !sameHash(member.tokenHash, tokenHash(memberToken))) throw new HttpError(401, "그룹 참여 키가 올바르지 않아요. 다시 참여해 주세요.");
  return member;
}

function defaultProgressItems(weeklyRange, cumulativeRange) {
  const now = new Date().toISOString();
  return [
    { id: "core-12", title: "복음의 온전성 핵심 12구절", range: "핵심 12구절", active: true, createdAt: now },
    { id: `weekly-${Date.now()}`, title: "이번 주 새 진도", range: optionalText(weeklyRange, 80) || "에베소서 2:10–18", active: true, createdAt: now },
    { id: `cumulative-${Date.now()}`, title: "누적 암송", range: optionalText(cumulativeRange, 80) || "이전 암송분 전체", active: true, createdAt: now },
  ];
}

async function createTeam(body) {
  const name = cleanText(body.teamName, 40, "그룹 이름");
  const memberName = cleanText(body.memberName, 20, "내 이름");
  let code;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = randomCode();
    if (!(await readJson(groupPath(candidate)))) {
      code = candidate;
      break;
    }
  }
  if (!code) throw new HttpError(503, "그룹 코드를 만들지 못했어요. 잠시 후 다시 시도해 주세요.");

  const memberId = randomUUID();
  const memberToken = newToken();
  const createdAt = new Date().toISOString();
  const group = {
    version: 1,
    code,
    name,
    createdAt,
    leaderMemberId: memberId,
    progressItems: defaultProgressItems(body.weeklyRange, body.cumulativeRange),
  };
  const member = { id: memberId, name: memberName, role: "leader", joinedAt: createdAt, tokenHash: tokenHash(memberToken) };

  await writeJson(groupPath(code), group);
  try {
    await writeJson(memberPath(code, memberId), member);
  } catch (error) {
    throw new HttpError(503, "그룹 멤버를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  return json({ ok: true, group: publicGroup(group), session: publicSession(member, memberToken, code) }, 201);
}

async function joinTeam(body) {
  const code = normalizeCode(body.code);
  await requireGroup(code);
  const name = cleanText(body.memberName, 20, "내 이름");
  const members = await listJson(`teams/${code}/members/`, 200);
  if (members.some((member) => member.name.toLocaleLowerCase("ko") === name.toLocaleLowerCase("ko"))) {
    throw new HttpError(409, "그룹에 같은 이름이 있어요. 구분할 수 있는 이름으로 참여해 주세요.");
  }
  if (members.length >= 50) throw new HttpError(409, "이 그룹은 최대 50명까지 참여할 수 있어요.");

  const memberId = randomUUID();
  const memberToken = newToken();
  const member = { id: memberId, name, role: "member", joinedAt: new Date().toISOString(), tokenHash: tokenHash(memberToken) };
  await writeJson(memberPath(code, memberId), member);
  return json({ ok: true, session: publicSession(member, memberToken, code) }, 201);
}

function publicGroup(group) {
  return {
    code: group.code,
    name: group.name,
    createdAt: group.createdAt,
    progressItems: (group.progressItems || []).filter((item) => item.active !== false),
  };
}

function publicSession(member, memberToken, code) {
  return { code, memberId: member.id, memberToken, memberName: member.name, role: member.role };
}

async function dashboard(code, requestUrl) {
  const groupResult = await requireGroup(code);
  const group = groupResult.data;
  const [members, allCertifications] = await Promise.all([
    listJson(`teams/${code}/members/`, 200),
    listJson(`teams/${code}/certifications/`, 1000),
  ]);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 45);
  cutoff.setHours(0, 0, 0, 0);
  const certifications = allCertifications
    .filter((item) => new Date(item.createdAt).getTime() >= cutoff.getTime())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 500)
    .map((item) => ({
      id: item.id,
      memberId: item.memberId,
      progressId: item.progressId,
      note: item.note || "",
      date: item.date,
      createdAt: item.createdAt,
      hasAudio: Boolean(item.audioPath),
      audioUrl: item.audioPath ? `${requestUrl.origin}/api/team?action=audio&code=${encodeURIComponent(code)}&id=${encodeURIComponent(item.id)}` : "",
    }));

  return json({
    ok: true,
    group: publicGroup(group),
    members: members
      .map(({ id, name, role, joinedAt }) => ({ id, name, role, joinedAt }))
      .sort((a, b) => (a.role === "leader" ? -1 : b.role === "leader" ? 1 : a.joinedAt.localeCompare(b.joinedAt))),
    certifications,
    serverDate: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()),
  });
}

async function addProgress(body) {
  const code = normalizeCode(body.code);
  const member = await requireMember(code, body.memberId, body.memberToken);
  if (member.role !== "leader") throw new HttpError(403, "새 진도는 그룹장만 추가할 수 있어요.");
  const title = cleanText(body.title, 40, "진도 이름");
  const range = cleanText(body.range, 80, "암송 범위");
  const groupResult = await requireGroup(code);
  const group = groupResult.data;
  const activeItems = (group.progressItems || []).filter((item) => item.active !== false);
  if (activeItems.length >= 20) throw new HttpError(409, "그룹 진도는 최대 20개까지 둘 수 있어요.");
  group.progressItems = [
    ...(group.progressItems || []),
    { id: `progress-${Date.now()}-${randomBytes(3).toString("hex")}`, title, range, active: true, createdAt: new Date().toISOString() },
  ];
  await writeJson(groupPath(code), group, { allowOverwrite: true, ifMatch: groupResult.etag });
  return json({ ok: true, group: publicGroup(group) });
}

async function certify(request) {
  const form = await request.formData();
  const code = normalizeCode(form.get("code"));
  const member = await requireMember(code, form.get("memberId"), form.get("memberToken"));
  const group = (await requireGroup(code)).data;
  const progressId = String(form.get("progressId") || "");
  if (!(group.progressItems || []).some((item) => item.id === progressId && item.active !== false)) throw new HttpError(400, "인증할 그룹 진도를 선택해 주세요.");
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const note = optionalText(form.get("note"), 140);
  const file = form.get("audio");
  const certificationId = randomUUID();
  let audioPath = "";

  if (file instanceof File && file.size > 0) {
    if (!String(file.type || "").startsWith("audio/")) throw new HttpError(400, "오디오 녹음 파일만 올릴 수 있어요.");
    if (file.size > MAX_AUDIO_BYTES) throw new HttpError(413, "녹음 파일은 3MB 이하로 올려 주세요.");
    const extension = String(file.name || "recording.webm").match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase() || "webm";
    audioPath = `teams/${code}/audio/${certificationId}.${extension}`;
    await put(audioPath, file, { access: ACCESS, contentType: file.type || "audio/webm", addRandomSuffix: false, cacheControlMaxAge: 300 });
  }

  const item = {
    id: certificationId,
    memberId: member.id,
    progressId,
    note,
    date,
    createdAt: new Date().toISOString(),
    audioPath,
  };
  await writeJson(certificationPath(code, date, certificationId), item);
  return json({ ok: true, certification: { ...item, audioPath: undefined, hasAudio: Boolean(audioPath) } }, 201);
}

async function serveAudio(code, certificationId) {
  if (!/^[a-f0-9-]{36}$/.test(String(certificationId || ""))) throw new HttpError(400, "녹음 식별값이 올바르지 않아요.");
  await requireGroup(code);
  const matches = await list({ prefix: `teams/${code}/audio/${certificationId}.`, limit: 2 });
  const blob = matches.blobs[0];
  if (!blob) throw new HttpError(404, "녹음 파일을 찾지 못했어요.");
  const result = await getBlob(blob.pathname, { access: ACCESS });
  if (!result?.stream) throw new HttpError(404, "녹음 파일을 찾지 못했어요.");
  return new Response(result.stream, {
    status: 200,
    headers: corsHeaders({
      "Content-Type": result.blob.contentType || "audio/webm",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
    }),
  });
}

async function parseJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "요청 내용을 읽지 못했어요.");
  }
}

async function handle(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  const url = new URL(request.url);
  const action = url.searchParams.get("action") || "dashboard";

  if (request.method === "GET" && action === "health") return json({ ok: true, storage: Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) });
  if (request.method === "GET" && action === "dashboard") return dashboard(normalizeCode(url.searchParams.get("code")), url);
  if (request.method === "GET" && action === "audio") return serveAudio(normalizeCode(url.searchParams.get("code")), url.searchParams.get("id"));
  if (request.method === "POST" && action === "create") return createTeam(await parseJsonBody(request));
  if (request.method === "POST" && action === "join") return joinTeam(await parseJsonBody(request));
  if (request.method === "POST" && action === "progress") return addProgress(await parseJsonBody(request));
  if (request.method === "POST" && action === "certify") return certify(request);
  throw new HttpError(404, "요청한 그룹 기능을 찾지 못했어요.");
}

export default {
  async fetch(request) {
    try {
      return await handle(request);
    } catch (error) {
      console.error("team-api", error);
      if (error?.name === "BlobPreconditionFailedError") return json({ ok: false, message: "다른 진도 변경과 겹쳤어요. 새로고침 후 다시 시도해 주세요." }, 409);
      const status = error instanceof HttpError ? error.status : 500;
      return json({ ok: false, message: status === 500 ? "그룹 서버에 잠시 문제가 생겼어요. 잠시 후 다시 시도해 주세요." : error.message }, status);
    }
  },
};
