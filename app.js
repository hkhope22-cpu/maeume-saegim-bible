(() => {
  "use strict";

  const STORAGE_KEY = "maeume-saegim-ephesians-v1";
  const TEAM_SESSION_KEY = "maeume-saegim-team-session-v1";
  const TEAM_PUBLIC_ORIGIN = "https://bible-maeum.vercel.app";
  const TEAM_API_URL = `${location.hostname.endsWith("vercel.app") ? "" : TEAM_PUBLIC_ORIGIN}/api/team`;
  const CHAPTER_COUNTS = [23, 22, 21, 32, 33, 24];
  const BIBLE_BOOKS = [
    ["GEN", "창세기"], ["EXO", "출애굽기"], ["LEV", "레위기"], ["NUM", "민수기"], ["DEU", "신명기"], ["JOS", "여호수아"], ["JDG", "사사기"], ["RUT", "룻기"], ["1SA", "사무엘상"], ["2SA", "사무엘하"], ["1KI", "열왕기상"], ["2KI", "열왕기하"], ["1CH", "역대상"], ["2CH", "역대하"], ["EZR", "에스라"], ["NEH", "느헤미야"], ["EST", "에스더"], ["JOB", "욥기"], ["PSA", "시편"], ["PRO", "잠언"], ["ECC", "전도서"], ["SOL", "아가"], ["ISA", "이사야"], ["JER", "예레미야"], ["LAM", "예레미야애가"], ["EZE", "에스겔"], ["DAN", "다니엘"], ["HOS", "호세아"], ["JOE", "요엘"], ["AMO", "아모스"], ["OBA", "오바댜"], ["JON", "요나"], ["MIC", "미가"], ["NAH", "나훔"], ["HAB", "하박국"], ["ZEP", "스바냐"], ["HAG", "학개"], ["ZEC", "스가랴"], ["MAL", "말라기"],
    ["MAT", "마태복음"], ["MAR", "마가복음"], ["LUK", "누가복음"], ["JOH", "요한복음"], ["ACT", "사도행전"], ["ROM", "로마서"], ["1CO", "고린도전서"], ["2CO", "고린도후서"], ["GAL", "갈라디아서"], ["EPH", "에베소서"], ["PHI", "빌립보서"], ["COL", "골로새서"], ["1TH", "데살로니가전서"], ["2TH", "데살로니가후서"], ["1TI", "디모데전서"], ["2TI", "디모데후서"], ["TIT", "디도서"], ["PHM", "빌레몬서"], ["HEB", "히브리서"], ["JAM", "야고보서"], ["1PE", "베드로전서"], ["2PE", "베드로후서"], ["1JO", "요한1서"], ["2JO", "요한2서"], ["3JO", "요한3서"], ["JUD", "유다서"], ["REV", "요한계시록"],
  ].map(([code, name], index) => ({ code, name, testament: index < 39 ? "old" : "new" }));
  const BIBLE_BOOK_BY_CODE = Object.fromEntries(BIBLE_BOOKS.map((book) => [book.code, book]));
  const CORE_BOOK_CODES = { 골로새서: "COL", 갈라디아서: "GAL", 에베소서: "EPH", 요한복음: "JOH", 빌립보서: "PHI" };
  const CORE_PASSAGES = [
    { id: "col-1-13", book: "골로새서", aliases: ["골로새서", "골"], chapter: 1, verse: 13, theme: "구원" },
    { id: "col-1-14", book: "골로새서", aliases: ["골로새서", "골"], chapter: 1, verse: 14, theme: "구원" },
    { id: "gal-2-20", book: "갈라디아서", aliases: ["갈라디아서", "갈"], chapter: 2, verse: 20, theme: "죽음·성령 연합" },
    { id: "eph-2-5", book: "에베소서", aliases: ["에베소서", "엡"], chapter: 2, verse: 5, theme: "부활·승천·보좌 연합" },
    { id: "eph-2-6", book: "에베소서", aliases: ["에베소서", "엡"], chapter: 2, verse: 6, theme: "부활·승천·보좌 연합" },
    { id: "col-3-1", book: "골로새서", aliases: ["골로새서", "골"], chapter: 3, verse: 1, theme: "부활·승천·보좌 연합" },
    { id: "col-3-2", book: "골로새서", aliases: ["골로새서", "골"], chapter: 3, verse: 2, theme: "부활·승천·보좌 연합" },
    { id: "col-3-3", book: "골로새서", aliases: ["골로새서", "골"], chapter: 3, verse: 3, theme: "부활·승천·보좌 연합" },
    { id: "john-14-20", book: "요한복음", aliases: ["요한복음", "요"], chapter: 14, verse: 20, theme: "보좌·성령 연합" },
    { id: "john-17-21", book: "요한복음", aliases: ["요한복음", "요"], chapter: 17, verse: 21, theme: "보좌·성령 연합" },
    { id: "phil-3-20", book: "빌립보서", aliases: ["빌립보서", "빌"], chapter: 3, verse: 20, theme: "재림 연합" },
    { id: "phil-3-21", book: "빌립보서", aliases: ["빌립보서", "빌"], chapter: 3, verse: 21, theme: "재림 연합" },
  ];
  const MODE_NAMES = { blank: "빈칸 채우기", initial: "첫글자 힌트", order: "순서 맞추기" };
  const defaultState = {
    verses: {},
    coreVerses: {},
    progress: {},
    mistakes: {},
    history: [],
    settings: { dailyGoal: 5 },
    weeklyPlan: { chapter: 2, start: 10, end: 18, refs: [] },
    cumulativeRefs: [],
    certifications: {},
    reminders: {
      enabled: false,
      weeklyTime: "09:00",
      cumulativeTime: "18:00",
      recordingTime: "21:00",
      lastSent: {},
    },
    lastSession: null,
  };

  let state = loadState();
  let activeView = "home";
  let libraryChapter = "all";
  let selectedRange = new Set([Number(state.weeklyPlan?.chapter || 2)]);
  const initialCustomRefs = weeklyRefs();
  const [initialCustomStartChapter, initialCustomStartVerse] = (initialCustomRefs[0] || "1:1").split(":").map(Number);
  const [initialCustomEndChapter, initialCustomEndVerse] = (initialCustomRefs[initialCustomRefs.length - 1] || "1:1").split(":").map(Number);
  let customRangeSelection = {
    startChapter: initialCustomStartChapter,
    startVerse: initialCustomStartVerse,
    endChapter: initialCustomEndChapter,
    endVerse: initialCustomEndVerse,
  };
  let practiceScope = "weekly";
  let preferredMode = "initial";
  let importScope = "ephesians";
  let game = null;
  let mediaRecorder = null;
  let recordingStream = null;
  let recordingChunks = [];
  let recordingStartedAt = 0;
  let recordingTimerId = null;
  let recordingBlob = null;
  let recordingUrl = null;
  let continuousAdvanceTimerId = null;
  let voiceRecognition = null;
  let voiceRecognitionId = 0;
  let voiceListening = false;
  let voiceFinalTranscript = "";
  let voiceInterimTranscript = "";
  let voiceMismatchAnnounced = false;
  let voiceAudioContext = null;
  let reminderIntervalId = null;
  let currentReminderAction = null;
  let bibleData = null;
  let bibleLoadState = "loading";
  let bibleLoadError = "";
  let bibleTestament = "all";
  let bibleSelection = { book: "GEN", chapter: 1, start: 1, end: 10 };
  let teamSession = loadTeamSession();
  let teamData = null;
  let teamLoading = false;
  let teamSelectedProgress = "";
  let teamPendingAudio = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved ? {
        ...structuredClone(defaultState), ...saved,
        settings: { ...defaultState.settings, ...(saved.settings || {}) },
        verses: saved.verses || {}, coreVerses: saved.coreVerses || {},
        progress: saved.progress || {}, mistakes: saved.mistakes || {}, history: saved.history || [],
        weeklyPlan: { ...defaultState.weeklyPlan, ...(saved.weeklyPlan || {}) },
        cumulativeRefs: saved.cumulativeRefs || [], certifications: saved.certifications || {},
        reminders: { ...defaultState.reminders, ...(saved.reminders || {}), lastSent: saved.reminders?.lastSent || {} },
      } : structuredClone(defaultState);
    } catch {
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadTeamSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(TEAM_SESSION_KEY));
      return saved?.code && saved?.memberId && saved?.memberToken ? saved : null;
    } catch {
      return null;
    }
  }

  function saveTeamSession(session) {
    teamSession = session;
    if (session) localStorage.setItem(TEAM_SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(TEAM_SESSION_KEY);
  }

  function todayKey(date = new Date()) {
    const y = date.getFullYear();
    return `${y}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function publicBibleText(bookCode, chapter, verse) {
    return bibleData?.books?.[bookCode]?.[chapter - 1]?.[verse - 1] || "";
  }

  function bibleRef(bookCode, chapter, verse) {
    return `bible:kor1910:${bookCode}:${chapter}:${verse}`;
  }

  function parseBibleRef(ref) {
    const match = String(ref || "").match(/^bible:kor1910:([1-3]?[A-Z]{2,3}):(\d+):(\d+)$/);
    return match ? { book: match[1], chapter: Number(match[2]), verse: Number(match[3]) } : null;
  }

  function bibleEntry(bookCode, chapter, verse) {
    const text = publicBibleText(bookCode, chapter, verse);
    const book = BIBLE_BOOK_BY_CODE[bookCode];
    if (!text || !book) return null;
    return { ref: bibleRef(bookCode, chapter, verse), text, book: book.name, bookCode, chapter, verse, displayRef: `${book.name} ${chapter}:${verse}`, isPublicBible: true };
  }

  function bibleRangeEntries(bookCode, chapter, start = 1, end = Number.MAX_SAFE_INTEGER) {
    const verses = bibleData?.books?.[bookCode]?.[chapter - 1] || [];
    const safeStart = Math.max(1, start);
    const safeEnd = Math.min(verses.length, end);
    const entries = [];
    for (let verse = safeStart; verse <= safeEnd; verse += 1) {
      const entry = bibleEntry(bookCode, chapter, verse);
      if (entry) entries.push(entry);
    }
    return entries;
  }

  function verseEntries() {
    const merged = {};
    (bibleData?.books?.EPH || []).forEach((chapter, chapterIndex) => chapter.forEach((text, verseIndex) => {
      merged[`${chapterIndex + 1}:${verseIndex + 1}`] = text;
    }));
    Object.assign(merged, state.verses);
    return Object.entries(merged)
      .map(([ref, text]) => ({ ref, text, book: "에베소서", chapter: Number(ref.split(":")[0]), verse: Number(ref.split(":")[1]), displayRef: `에베소서 ${ref}` }))
      .sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
  }

  function coreEntries() {
    return CORE_PASSAGES
      .map((passage) => ({
        passage,
        text: state.coreVerses[passage.id]
          || (passage.book === "에베소서" && state.verses[`${passage.chapter}:${passage.verse}`])
          || publicBibleText(CORE_BOOK_CODES[passage.book], passage.chapter, passage.verse),
      }))
      .filter((item) => item.text)
      .map(({ passage, text }) => ({
        ...passage,
        ref: `core:${passage.id}`,
        text,
        displayRef: `${passage.book} ${passage.chapter}:${passage.verse}`,
        isCore: true,
      }));
  }

  function allEntries() { return [...coreEntries(), ...verseEntries()]; }

  function entryForRef(ref) {
    const regular = allEntries().find((entry) => entry.ref === ref);
    if (regular) return regular;
    const parsed = parseBibleRef(ref);
    return parsed ? bibleEntry(parsed.book, parsed.chapter, parsed.verse) : null;
  }

  function mistakeEntries() {
    return Object.entries(state.mistakes || {})
      .map(([ref, note]) => ({ entry: entryForRef(ref), note }))
      .filter((item) => item.entry)
      .sort((a, b) => (b.note.count || 0) - (a.note.count || 0) || String(b.note.lastMistakeAt || "").localeCompare(String(a.note.lastMistakeAt || "")));
  }

  function weeklyRefs(plan = state.weeklyPlan) {
    if (Array.isArray(plan.refs) && plan.refs.length) {
      return [...new Set(plan.refs)]
        .filter((ref) => {
          const [chapter, verse] = ref.split(":").map(Number);
          return chapter >= 1 && chapter <= 6 && verse >= 1 && verse <= CHAPTER_COUNTS[chapter - 1];
        })
        .sort((a, b) => {
          const [aChapter, aVerse] = a.split(":").map(Number);
          const [bChapter, bVerse] = b.split(":").map(Number);
          return aChapter - bChapter || aVerse - bVerse;
        });
    }
    const refs = [];
    const start = Math.max(1, Math.min(plan.start, plan.end));
    const end = Math.min(CHAPTER_COUNTS[plan.chapter - 1], Math.max(plan.start, plan.end));
    for (let verse = start; verse <= end; verse += 1) refs.push(`${plan.chapter}:${verse}`);
    return refs;
  }

  function weeklyLabel(plan = state.weeklyPlan) {
    const refs = weeklyRefs(plan);
    if (!refs.length) return "새 진도 없음";
    const first = refs[0].split(":").map(Number);
    const last = refs[refs.length - 1].split(":").map(Number);
    const contiguous = refs.length === (last[0] === first[0] ? last[1] - first[1] + 1 : -1);
    if (contiguous) return `에베소서 ${first[0]}:${first[1]}${refs.length > 1 ? `–${last[1]}` : ""}`;
    return `에베소서 ${refs[0]} 외 ${refs.length - 1}절`;
  }

  function weeklyEntries() {
    const refs = new Set(weeklyRefs());
    return verseEntries().filter((verse) => refs.has(verse.ref));
  }

  function cumulativeEntries() {
    const current = new Set(weeklyRefs());
    const refs = new Set(state.cumulativeRefs.filter((ref) => !current.has(ref)));
    return verseEntries().filter((verse) => refs.has(verse.ref));
  }

  function ephesiansPosition(chapter, verse) {
    return CHAPTER_COUNTS.slice(0, chapter - 1).reduce((sum, count) => sum + count, 0) + verse;
  }

  function customRangeEntries() {
    const start = ephesiansPosition(customRangeSelection.startChapter, customRangeSelection.startVerse);
    const end = ephesiansPosition(customRangeSelection.endChapter, customRangeSelection.endVerse);
    return verseEntries().filter((entry) => {
      const position = ephesiansPosition(entry.chapter, entry.verse);
      return position >= start && position <= end;
    });
  }

  function customRangeLabel() {
    const start = customRangeSelection;
    const sameChapter = start.startChapter === start.endChapter;
    const sameVerse = sameChapter && start.startVerse === start.endVerse;
    if (sameVerse) return `에베소서 ${start.startChapter}:${start.startVerse}`;
    return sameChapter
      ? `에베소서 ${start.startChapter}:${start.startVerse}–${start.endVerse}`
      : `에베소서 ${start.startChapter}:${start.startVerse}–${start.endChapter}:${start.endVerse}`;
  }

  function normalize(text) {
    return String(text || "").normalize("NFC").replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();
  }

  function formatRef(ref) {
    const parsedBibleRef = parseBibleRef(ref);
    if (parsedBibleRef) {
      const book = BIBLE_BOOK_BY_CODE[parsedBibleRef.book];
      return book ? `${book.name} ${parsedBibleRef.chapter}:${parsedBibleRef.verse}` : ref;
    }
    if (ref.startsWith("core:")) {
      const passage = CORE_PASSAGES.find((item) => `core:${item.id}` === ref);
      return passage ? `${passage.book} ${passage.chapter}:${passage.verse}` : ref;
    }
    return `에베소서 ${ref}`;
  }

  function todayDoneFor(entries) {
    const refs = new Set(entries.map((entry) => entry.ref));
    return new Set(todayHistory().filter((item) => refs.has(item.ref)).map((item) => item.ref)).size;
  }

  function todayHistory() { return state.history.filter((item) => item.date === todayKey()); }

  function streak() {
    const dates = new Set(state.history.map((h) => h.date));
    let count = 0;
    const cursor = new Date();
    if (!dates.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (dates.has(todayKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  async function loadBibleData(forceReload = false) {
    bibleLoadState = "loading";
    bibleLoadError = "";
    renderBibleSourceState();
    try {
      const url = `./data/kor1910.json${forceReload ? `?refresh=${Date.now()}` : ""}`;
      const response = await fetch(url, { cache: forceReload ? "reload" : "default" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload?.meta || payload.meta.license !== "Public Domain" || Object.keys(payload.books || {}).length !== 66) {
        throw new Error("공개 성경 데이터 형식이 올바르지 않습니다.");
      }
      bibleData = payload;
      bibleLoadState = "ready";
      const currentBook = bibleData.books[bibleSelection.book] ? bibleSelection.book : "GEN";
      bibleSelection = { ...bibleSelection, book: currentBook };
      renderAll();
      if (forceReload) showToast("공개 성경 66권을 다시 불러왔어요.", "good");
    } catch (error) {
      bibleLoadState = "error";
      bibleLoadError = error?.message || "알 수 없는 오류";
      renderBibleView();
      showToast("공개 성경 본문을 불러오지 못했어요. 인터넷 또는 서버 상태를 확인해 주세요.", "warn");
    }
  }

  function renderAll() {
    renderStats();
    renderBibleView();
    renderLibrary();
    renderMistakes();
    renderProgress();
    renderTeam();
    renderRange();
    renderImportUI();
    renderWeeklyForm();
    renderRecordingChecklist();
  }

  function teamInviteCode() {
    return String(new URLSearchParams(location.search).get("team") || "").toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 8);
  }

  function teamInviteUrl(code = teamSession?.code) {
    const url = new URL(TEAM_PUBLIC_ORIGIN);
    if (code) url.searchParams.set("team", code);
    return url.toString();
  }

  function teamDateKeys(serverDate = todayKey()) {
    const [year, month, day] = serverDate.split("-").map(Number);
    const base = new Date(year, month - 1, day, 12);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(base);
      date.setDate(base.getDate() - (6 - index));
      return {
        key: todayKey(date),
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        weekday: ["일", "월", "화", "수", "목", "금", "토"][date.getDay()],
        today: index === 6,
      };
    });
  }

  function setSelectOptions(select, items, selectedValue) {
    select.innerHTML = "";
    items.forEach((item) => {
      const option = el("option", "", `${item.title} · ${item.range}`);
      option.value = item.id;
      select.append(option);
    });
    if (items.some((item) => item.id === selectedValue)) select.value = selectedValue;
  }

  function renderTeam() {
    const invite = teamInviteCode();
    if (invite && !teamSession && !$("#joinTeamCode").value) $("#joinTeamCode").value = invite;
    const joined = Boolean(teamSession);
    $("#teamWelcomeState").hidden = joined;
    $("#teamDashboardState").hidden = !joined;
    $("#leaveTeamBtn").hidden = !joined;
    $("#uploadTeamRecordingBtn").hidden = !joined;
    $("#uploadTeamRecordingBtn").disabled = !joined || !recordingBlob;
    $("#useLatestRecordingBtn").disabled = !recordingBlob;
    if (!joined) {
      $("#teamNavCount").textContent = "+";
      return;
    }

    const group = teamData?.group;
    const members = teamData?.members || [];
    const certifications = teamData?.certifications || [];
    $("#teamCode").textContent = teamSession.code;
    $("#teamMemberName").textContent = teamSession.memberName;
    $("#teamRoleBadge").textContent = teamSession.role === "leader" ? "그룹장" : "그룹 멤버";
    $("#teamName").textContent = group?.name || (teamLoading ? "그룹 현황을 불러오는 중…" : "함께 암송");
    $("#teamProgressForm").hidden = teamSession.role !== "leader";
    $("#teamNavCount").textContent = members.length || "·";

    if (!group) {
      $("#teamMemberCount").innerHTML = `—<small>명</small>`;
      $("#teamTodayCount").innerHTML = `—<small>명</small>`;
      $("#teamWeekCount").innerHTML = `—<small>회</small>`;
      $("#teamProgressCaption").textContent = teamLoading ? "그룹 현황을 불러오고 있어요." : "새로고침하여 그룹 현황을 확인해 주세요.";
      $("#teamStatusHead").innerHTML = "";
      $("#teamStatusBody").innerHTML = "";
      $("#teamCertificationFeed").innerHTML = `<div class="team-empty">${teamLoading ? "그룹 인증을 불러오는 중이에요." : "아직 불러온 인증이 없어요."}</div>`;
      return;
    }

    const progressItems = group.progressItems || [];
    if (!progressItems.some((item) => item.id === teamSelectedProgress)) teamSelectedProgress = progressItems[0]?.id || "";
    setSelectOptions($("#teamProgressFilter"), progressItems, teamSelectedProgress);
    setSelectOptions($("#teamCertProgress"), progressItems, $("#teamCertProgress").value || teamSelectedProgress);
    const dates = teamDateKeys(teamData.serverDate);
    const recentDateSet = new Set(dates.map((date) => date.key));
    const today = dates[dates.length - 1]?.key || todayKey();
    const todayMembers = new Set(certifications.filter((item) => item.date === today).map((item) => item.memberId));
    const weekCertifications = certifications.filter((item) => recentDateSet.has(item.date));
    $("#teamMemberCount").innerHTML = `${members.length}<small>명</small>`;
    $("#teamTodayCount").innerHTML = `${todayMembers.size}<small>명</small>`;
    $("#teamWeekCount").innerHTML = `${weekCertifications.length}<small>회</small>`;

    const selectedProgress = progressItems.find((item) => item.id === teamSelectedProgress);
    const progressCaption = $("#teamProgressCaption");
    progressCaption.innerHTML = "";
    if (selectedProgress) progressCaption.append(el("strong", "", selectedProgress.title), document.createTextNode(` · ${selectedProgress.range}`));
    else progressCaption.textContent = "그룹 진도를 선택해 주세요.";
    const filtered = certifications.filter((item) => item.progressId === teamSelectedProgress && recentDateSet.has(item.date));
    const certificationMap = new Map();
    filtered.forEach((item) => certificationMap.set(`${item.memberId}:${item.date}`, item));
    const headRow = el("tr");
    const friendHead = el("th", "", "친구");
    headRow.append(friendHead);
    dates.forEach((date) => {
      const th = el("th", date.today ? "today" : "", `${date.weekday} ${date.label}`);
      headRow.append(th);
    });
    $("#teamStatusHead").replaceChildren(headRow);
    const body = $("#teamStatusBody");
    body.innerHTML = "";
    members.forEach((member) => {
      const row = el("tr");
      const nameCell = el("td");
      const memberCell = el("div", "team-member-cell");
      const avatar = el("i", "", member.name.slice(0, 1));
      const name = el("span", "", member.name);
      memberCell.append(avatar, name);
      if (member.role === "leader") memberCell.append(el("em", "", "그룹장"));
      nameCell.append(memberCell);
      row.append(nameCell);
      dates.forEach((date) => {
        const cell = el("td");
        const certification = certificationMap.get(`${member.id}:${date.key}`);
        const mark = el("span", `team-check${certification ? " done" : ""}${certification?.hasAudio ? " audio" : ""}`, certification ? "✓" : "·");
        mark.title = certification ? `${member.name} 인증 완료${certification.hasAudio ? " · 녹음 있음" : ""}` : "인증 대기";
        cell.append(mark);
        row.append(cell);
      });
      body.append(row);
    });

    const memberById = Object.fromEntries(members.map((member) => [member.id, member]));
    const progressById = Object.fromEntries(progressItems.map((item) => [item.id, item]));
    const feed = $("#teamCertificationFeed");
    feed.innerHTML = "";
    if (!certifications.length) {
      feed.innerHTML = `<div class="team-empty">첫 인증을 기다리고 있어요. 오늘 암송을 마쳤다면 완료 표시를 남겨 보세요.</div>`;
    } else {
      certifications.slice(0, 20).forEach((item) => {
        const member = memberById[item.memberId] || { name: "그룹 친구" };
        const progress = progressById[item.progressId] || { title: "이전 진도", range: "" };
        const card = el("article", "team-feed-item");
        const avatar = el("div", "team-feed-avatar", member.name.slice(0, 1));
        const copy = el("div", "team-feed-copy");
        copy.append(el("strong", "", `${member.name} · ${progress.title}`), el("span", "", `${progress.range} · 인증 완료`));
        if (item.note) copy.append(el("p", "", item.note));
        card.append(avatar, copy);
        if (item.hasAudio && item.audioUrl) {
          const audio = document.createElement("audio");
          audio.controls = true;
          audio.preload = "none";
          audio.src = item.audioUrl;
          audio.setAttribute("aria-label", `${member.name}님의 암송 녹음`);
          card.append(audio);
        } else {
          const time = el("time", "team-feed-time", new Date(item.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }));
          card.append(time);
        }
        feed.append(card);
      });
    }
  }

  async function teamRequest(action, options = {}) {
    const response = await fetch(`${TEAM_API_URL}?action=${encodeURIComponent(action)}${options.query ? `&${options.query}` : ""}`, {
      method: options.method || "GET",
      headers: options.json ? { "Content-Type": "application/json" } : undefined,
      body: options.json ? JSON.stringify(options.json) : options.body,
    });
    const result = await response.json().catch(() => ({ ok: false, message: "그룹 서버의 응답을 읽지 못했어요." }));
    if (!response.ok || !result.ok) throw new Error(result.message || "그룹 요청을 처리하지 못했어요.");
    return result;
  }

  async function loadTeamDashboard(showSuccess = false) {
    if (!teamSession || teamLoading) return;
    teamLoading = true;
    renderTeam();
    try {
      teamData = await teamRequest("dashboard", { query: `code=${encodeURIComponent(teamSession.code)}` });
      if (showSuccess) showToast("그룹 현황을 새로 불러왔어요.", "good");
    } catch (error) {
      showToast(error.message || "그룹 현황을 불러오지 못했어요.", "warn");
    } finally {
      teamLoading = false;
      renderTeam();
    }
  }

  function setTeamFormBusy(form, busy) {
    $$('button, input, textarea, select', form).forEach((control) => { control.disabled = busy; });
  }

  async function createTeam(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setTeamFormBusy(form, true);
    try {
      const result = await teamRequest("create", {
        method: "POST",
        json: {
          teamName: $("#createTeamName").value,
          memberName: $("#createMemberName").value,
          weeklyRange: weeklyLabel(),
          cumulativeRange: cumulativeEntries().length ? `에베소서 누적 ${cumulativeEntries().length}절` : "이전 암송분 전체",
        },
      });
      saveTeamSession(result.session);
      teamData = null;
      history.replaceState({}, "", `${location.pathname}?team=${encodeURIComponent(result.session.code)}`);
      renderTeam();
      await loadTeamDashboard();
      showToast("그룹을 만들었어요. 초대 링크를 친구에게 보내 보세요.", "good");
    } catch (error) {
      showToast(error.message, "warn");
    } finally {
      setTeamFormBusy(form, false);
    }
  }

  async function joinTeam(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setTeamFormBusy(form, true);
    try {
      const result = await teamRequest("join", { method: "POST", json: { code: $("#joinTeamCode").value, memberName: $("#joinMemberName").value } });
      saveTeamSession(result.session);
      teamData = null;
      history.replaceState({}, "", `${location.pathname}?team=${encodeURIComponent(result.session.code)}`);
      renderTeam();
      await loadTeamDashboard();
      showToast("그룹에 참여했어요. 오늘 인증을 함께 이어가요.", "good");
    } catch (error) {
      showToast(error.message, "warn");
    } finally {
      setTeamFormBusy(form, false);
    }
  }

  async function addTeamProgress(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setTeamFormBusy(form, true);
    try {
      await teamRequest("progress", {
        method: "POST",
        json: {
          code: teamSession.code,
          memberId: teamSession.memberId,
          memberToken: teamSession.memberToken,
          title: $("#newTeamProgressTitle").value,
          range: $("#newTeamProgressRange").value,
        },
      });
      form.reset();
      await loadTeamDashboard();
      showToast("새 그룹 진도를 추가했어요.", "good");
    } catch (error) {
      showToast(error.message, "warn");
    } finally {
      setTeamFormBusy(form, false);
    }
  }

  function setTeamPendingAudio(file) {
    teamPendingAudio = file && file.size ? file : null;
    $("#teamAudioFileName").textContent = teamPendingAudio ? `${teamPendingAudio.name || "방금 녹음"} · ${(teamPendingAudio.size / 1024 / 1024).toFixed(2)}MB` : "파일을 선택하지 않았어요";
  }

  async function submitTeamCertification(event) {
    event.preventDefault();
    if (!teamSession) return;
    if (teamPendingAudio?.size > 3 * 1024 * 1024) {
      showToast("녹음 파일은 3MB 이하로 올려 주세요.", "warn");
      return;
    }
    const form = event.currentTarget;
    setTeamFormBusy(form, true);
    try {
      const data = new FormData();
      data.append("code", teamSession.code);
      data.append("memberId", teamSession.memberId);
      data.append("memberToken", teamSession.memberToken);
      data.append("progressId", $("#teamCertProgress").value);
      data.append("note", $("#teamCertNote").value);
      if (teamPendingAudio) {
        const extension = teamPendingAudio.type.includes("mp4") ? "m4a" : teamPendingAudio.type.includes("mpeg") ? "mp3" : "webm";
        const file = teamPendingAudio instanceof File ? teamPendingAudio : new File([teamPendingAudio], `암송인증-${todayKey()}.${extension}`, { type: teamPendingAudio.type || "audio/webm" });
        data.append("audio", file);
      }
      await teamRequest("certify", { method: "POST", body: data });
      $("#teamCertNote").value = "";
      $("#teamAudioFile").value = "";
      setTeamPendingAudio(null);
      await loadTeamDashboard();
      showToast("오늘의 그룹 인증을 올렸어요.", "good");
    } catch (error) {
      showToast(error.message, "warn");
    } finally {
      setTeamFormBusy(form, false);
    }
  }

  async function copyTeamInvite() {
    const text = teamInviteUrl();
    try {
      await navigator.clipboard.writeText(text);
      showToast("초대 링크를 복사했어요.", "good");
    } catch {
      prompt("이 초대 링크를 복사해 친구에게 보내 주세요.", text);
    }
  }

  async function shareTeamInvite() {
    const url = teamInviteUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: `${teamData?.group?.name || "함께 암송"} 초대`, text: `마음에 새김 그룹에 함께해요. 초대코드 ${teamSession.code}`, url });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    await copyTeamInvite();
  }

  async function copyTeamCode() {
    try {
      await navigator.clipboard.writeText(teamSession.code);
      showToast("8자리 초대코드를 복사했어요.", "good");
    } catch {
      prompt("초대코드를 복사해 주세요.", teamSession.code);
    }
  }

  function renderStats() {
    const core = coreEntries();
    const weekly = weeklyEntries();
    const cumulative = cumulativeEntries();
    const coreDone = todayDoneFor(core);
    const weeklyDone = todayDoneFor(weekly);
    const cumulativeDone = todayDoneFor(cumulative);
    const goal = CORE_PASSAGES.length;
    const pct = Math.min(100, Math.round((coreDone / goal) * 100));
    const certified = Boolean(state.certifications[todayKey()]);
    const weeklyTitle = weeklyLabel();
    $("#dailyDone").textContent = coreDone;
    $("#dailyGoal").textContent = goal;
    $("#sideDailyDone").textContent = coreDone;
    $("#sideDailyGoal").textContent = goal;
    $("#sideDailyBar").style.width = `${pct}%`;
    $("#goalRing").style.setProperty("--progress", `${pct * 3.6}deg`);
    $("#reviewCount").textContent = weeklyTitle.replace("에베소서 ", "");
    $("#masteredCount").textContent = certified ? "완료 ✓" : "대기 중";
    $("#streakCount").textContent = streak();
    $("#dailyEncouragement").textContent = coreDone >= goal ? "핵심 12구절을 모두 선포했어요!" : coreDone ? `${goal - coreDone}절 더 암송하면 핵심 완료` : "오늘의 핵심 말씀을 기다려요";
    const date = new Date();
    $("#dateChip").textContent = `${date.getMonth() + 1}월 ${date.getDate()}일`;
    $("#continueTitle").textContent = certified ? "오늘의 녹음 인증을 마쳤어요" : "오늘 암송을 녹음으로 인증해요";
    $("#continueText").textContent = certified ? `${state.certifications[todayKey()].time || "오늘"}에 인증했습니다. 다시 녹음할 수도 있어요.` : "녹음 파일은 서버로 전송되지 않으며 직접 저장하거나 공유할 수 있어요.";
    $("#continueBtn").textContent = certified ? "다시 녹음" : "녹음 인증";

    $("#corePlanStatus").textContent = `${coreDone} / ${goal}`;
    $("#corePlanBar").style.width = `${pct}%`;
    $("#weeklyPlanTitle").textContent = weeklyTitle;
    $("#weeklyPlanStatus").textContent = `${weeklyDone} / ${weeklyRefs().length}`;
    $("#weeklyPlanBar").style.width = `${weeklyRefs().length ? Math.min(100, weeklyDone / weeklyRefs().length * 100) : 0}%`;
    $("#cumulativePlanStatus").textContent = cumulative.length ? `${cumulativeDone} / ${cumulative.length}` : "0절";
    $("#cumulativePlanText").textContent = cumulative.length ? `이전 진도 ${cumulative.length}절을 처음부터 다시 이어 암송해요.` : "지난 주 진도는 다음 주부터 자동으로 이곳에 쌓여요.";
    $("#cumulativePlanBar").style.width = `${cumulative.length ? Math.min(100, cumulativeDone / cumulative.length * 100) : 0}%`;
    $("[data-plan='cumulative']").disabled = cumulative.length === 0;
    $("#settingsWeeklyLabel").textContent = weeklyTitle;
    renderReminderSettings();
    renderReminderBanner();
  }

  function renderLibrary() {
    const ephesians = verseEntries();
    const core = coreEntries();
    const entries = [...core, ...ephesians];
    const tabs = $("#chapterTabs");
    tabs.innerHTML = "";
    [{ value: "all", label: `전체 ${entries.length}` }, { value: "core", label: `핵심 12 · ${core.length}` }, ...CHAPTER_COUNTS.map((_, i) => ({ value: String(i + 1), label: `에베소서 ${i + 1}장 · ${ephesians.filter((v) => v.chapter === i + 1).length}` }))].forEach((tab) => {
      const button = el("button", `chapter-tab${libraryChapter === tab.value ? " active" : ""}`, tab.label);
      button.dataset.chapter = tab.value;
      button.role = "tab";
      tabs.append(button);
    });
    const filtered = libraryChapter === "all" ? entries : libraryChapter === "core" ? core : ephesians.filter((v) => String(v.chapter) === libraryChapter);
    const list = $("#libraryList");
    list.innerHTML = "";
    const personalCount = Object.keys(state.verses).length + Object.keys(state.coreVerses).length;
    $("#librarySubtitle").textContent = `공개역 핵심 ${core.length}/12절 · 에베소서 ${ephesians.length}/155절${personalCount ? ` · 개인 입력 ${personalCount}절 우선 적용` : ""}`;
    if (!filtered.length) {
      const empty = el("div", "empty-state");
      empty.innerHTML = bibleLoadState === "loading"
        ? `<span>◌</span><h3>공개 본문을 준비하고 있어요</h3><p>잠시 뒤 핵심 말씀과 에베소서가 자동으로 나타납니다.</p>`
        : `<span>❧</span><h3>${entries.length ? "이 범위에는 담긴 말씀이 없어요" : "공개 본문을 불러오지 못했어요"}</h3><p>성경 전체 메뉴에서 공개 본문을 다시 불러오거나, 내가 이용할 수 있는 번역을 추가해 주세요.</p><button class="primary-button small empty-import">내 번역 추가</button>`;
      list.append(empty);
      return;
    }
    filtered.forEach((verse) => {
      const level = state.progress[verse.ref]?.level || 0;
      const row = el("article", "verse-row");
      row.innerHTML = `<span class="reference">${formatRef(verse.ref)}</span><span class="text"></span><span class="mastery" aria-label="익숙함 ${level}/5">${[1,2,3,4,5].map((n) => `<i class="${n <= level ? "filled" : ""}"></i>`).join("")}</span><button class="icon-button verse-play" data-ref="${verse.ref}" aria-label="${formatRef(verse.ref)} 연습"><svg viewBox="0 0 24 24"><path d="m9 6 9 6-9 6V6Z"/></svg></button>`;
      $(".text", row).textContent = verse.text;
      list.append(row);
    });
  }

  function renderProgress() {
    const entries = verseEntries();
    const mastered = Object.values(state.progress).filter((p) => (p.level || 0) >= 4).length;
    $("#progressToday").innerHTML = `${todayDoneFor(coreEntries())}<small>/12</small>`;
    $("#progressTotal").innerHTML = `${state.history.length}<small>회</small>`;
    $("#progressMastered").innerHTML = `${mastered}<small>절</small>`;
    const container = $("#chapterProgressList");
    container.innerHTML = "";
    CHAPTER_COUNTS.forEach((_, index) => {
      const chapter = index + 1;
      const saved = entries.filter((v) => v.chapter === chapter);
      const value = saved.length ? Math.round(saved.reduce((sum, v) => sum + (state.progress[v.ref]?.level || 0), 0) / (saved.length * 5) * 100) : 0;
      const row = el("div", "chapter-progress-row");
      row.innerHTML = `<strong>${chapter}장</strong><div class="progress-track"><i style="width:${value}%"></i></div><span>${value}%</span>`;
      container.append(row);
    });
    const recent = $("#recentList");
    recent.innerHTML = "";
    if (!state.history.length) {
      recent.innerHTML = `<div class="empty-state"><span>✦</span><h3>첫 기록을 기다려요</h3><p>한 절을 연습하면 여기에 차곡차곡 남습니다.</p></div>`;
    } else {
      state.history.slice(-8).reverse().forEach((item) => {
        const row = el("div", "recent-item");
        row.innerHTML = `<strong>${formatRef(item.ref)}</strong><span>${MODE_NAMES[item.mode] || "암송 연습"} · ${item.date}</span><em>+${item.points ?? (item.correct ? 100 : 40)}</em>`;
        recent.append(row);
      });
    }
  }

  function renderMistakes() {
    const items = mistakeEntries();
    $("#mistakeNavCount").textContent = items.length;
    $("#mistakeTotalCount").textContent = items.length;
    $("#reviewAllMistakesBtn").disabled = items.length === 0;
    const list = $("#mistakeList");
    list.innerHTML = "";
    if (!items.length) {
      list.innerHTML = `<div class="empty-state"><span>✓</span><h3>복습할 오답이 없어요</h3><p>실제 글자가 다르게 입력된 구절이 생기면 여기에 자동으로 모입니다.</p></div>`;
      return;
    }
    items.forEach(({ entry, note }) => {
      const row = el("article", "mistake-item");
      const lastAnswer = note.lastActual || "기록 없음";
      row.innerHTML = `<div class="mistake-ref"><span class="soft-badge">${note.count || 1}회 틀림</span><h3>${formatRef(entry.ref)}</h3><p class="mistake-answer"></p></div><div class="mistake-status"><span>연속 정확</span><strong>${note.correctStreak || 0} / 2</strong><div class="mini-progress"><i style="width:${Math.min(100, (note.correctStreak || 0) * 50)}%"></i></div></div><button class="outline-button mistake-play" data-mistake-ref="${entry.ref}">이 구절 반복</button>`;
      $(".mistake-answer", row).textContent = `최근 내 답: ${lastAnswer}`;
      list.append(row);
    });
  }

  function renderRange() {
    const entries = verseEntries();
    renderCustomRangeControls();
    const weekly = weeklyEntries();
    const cumulative = cumulativeEntries();
    if (practiceScope === "weekly" && !weekly.length) practiceScope = "custom";
    if (practiceScope === "cumulative" && !cumulative.length) practiceScope = "custom";
    $$("#practiceScopeGrid [data-practice-scope]").forEach((button) => {
      button.classList.toggle("active", button.dataset.practiceScope === practiceScope);
      button.disabled = button.dataset.practiceScope === "cumulative" && !cumulative.length;
    });
    $("#scopeWeeklyLabel").textContent = weeklyLabel();
    $("#scopeCumulativeLabel").textContent = cumulative.length ? `${cumulative.length}절` : "아직 없음";
    $("#customRangePanel").hidden = practiceScope !== "custom";

    const customEntries = customRangeEntries();
    const summaries = {
      weekly: `${weeklyLabel()} · 입력한 새 진도 ${weekly.length}절을 모두 연습합니다.`,
      cumulative: cumulative.length ? `이전 암송분 ${cumulative.length}절을 처음부터 누적해 연습합니다.` : "누적된 이전 진도가 아직 없어요.",
      custom: customEntries.length ? `${customRangeLabel()} · ${customEntries.length}절을 선택한 순서대로 모두 연습합니다.` : "선택한 범위에 사용할 수 있는 본문이 없어요.",
      bible: "성경 전체 메뉴로 이동해 성경·장·시작 절·마지막 절을 선택합니다.",
    };
    $("#rangeSummary").textContent = summaries[practiceScope];
    $("#startRangeBtn").textContent = practiceScope === "bible" ? "성경 전체에서 범위 고르기" : "선택한 진도로 시작";
    $("#startRangeBtn").disabled = practiceScope === "weekly" ? !weekly.length : practiceScope === "cumulative" ? !cumulative.length : practiceScope === "custom" ? !customEntries.length : false;
  }

  function fillNumberSelect(select, count, value, suffix) {
    select.innerHTML = Array.from({ length: count }, (_, index) => `<option value="${index + 1}">${index + 1}${suffix}</option>`).join("");
    select.value = String(Math.max(1, Math.min(count, value)));
  }

  function renderCustomRangeControls() {
    const startChapter = $("#customStartChapter");
    const endChapter = $("#customEndChapter");
    fillNumberSelect(startChapter, CHAPTER_COUNTS.length, customRangeSelection.startChapter, "장");
    fillNumberSelect(endChapter, CHAPTER_COUNTS.length, customRangeSelection.endChapter, "장");
    fillNumberSelect($("#customStartVerse"), CHAPTER_COUNTS[customRangeSelection.startChapter - 1], customRangeSelection.startVerse, "절");
    fillNumberSelect($("#customEndVerse"), CHAPTER_COUNTS[customRangeSelection.endChapter - 1], customRangeSelection.endVerse, "절");
  }

  function updateCustomRange(changedSide) {
    const next = {
      startChapter: Number($("#customStartChapter").value),
      startVerse: Number($("#customStartVerse").value),
      endChapter: Number($("#customEndChapter").value),
      endVerse: Number($("#customEndVerse").value),
    };
    next.startVerse = Math.min(next.startVerse, CHAPTER_COUNTS[next.startChapter - 1]);
    next.endVerse = Math.min(next.endVerse, CHAPTER_COUNTS[next.endChapter - 1]);
    if (ephesiansPosition(next.startChapter, next.startVerse) > ephesiansPosition(next.endChapter, next.endVerse)) {
      if (changedSide === "start") {
        next.endChapter = next.startChapter;
        next.endVerse = next.startVerse;
      } else {
        next.startChapter = next.endChapter;
        next.startVerse = next.endVerse;
      }
    }
    customRangeSelection = next;
    renderRange();
  }

  function openPracticeRange(mode = preferredMode) {
    preferredMode = mode;
    practiceScope = weeklyEntries().length ? "weekly" : "custom";
    renderRange();
    openModal("#rangeModal");
  }

  function startSelectedPracticeRange() {
    if (practiceScope === "bible") {
      closeModal($("#rangeModal"));
      switchView("bible");
      return;
    }
    let queue = null;
    let sessionType = "free";
    if (practiceScope === "weekly") { queue = weeklyEntries(); sessionType = "weekly"; }
    if (practiceScope === "cumulative") { queue = cumulativeEntries(); sessionType = "cumulative"; }
    if (practiceScope === "custom") queue = customRangeEntries();
    closeModal($("#rangeModal"));
    startGame(preferredMode, selectedRange, null, queue, sessionType);
  }

  function renderBibleSourceState() {
    const status = $("#bibleSourceStatus");
    const count = $("#bibleSourceCount");
    const reload = $("#reloadBibleBtn");
    if (!status || !count || !reload) return;
    reload.disabled = bibleLoadState === "loading";
    reload.textContent = bibleLoadState === "loading" ? "본문 불러오는 중…" : "본문 다시 불러오기";
    status.className = bibleLoadState === "ready" ? "good" : bibleLoadState === "error" ? "error" : "";
    if (bibleLoadState === "ready") {
      count.textContent = `${bibleData.meta.bookCount}권 · ${Number(bibleData.meta.verseCount).toLocaleString("ko-KR")}절`;
      status.textContent = "모든 방문자가 바로 이용할 수 있어요";
    } else if (bibleLoadState === "error") {
      count.textContent = "공개 본문을 불러오지 못했어요";
      status.textContent = bibleLoadError || "다시 시도해 주세요";
    } else {
      count.textContent = "66권 · 불러오는 중";
      status.textContent = "본문을 준비하고 있어요";
    }
  }

  function renderBibleView() {
    renderBibleSourceState();
    $$("#testamentFilter [data-testament]").forEach((button) => button.classList.toggle("active", button.dataset.testament === bibleTestament));
    const list = $("#bibleChapterList");
    if (bibleLoadState !== "ready" || !bibleData) {
      $("#practiceWholeChapterBtn").disabled = true;
      $("#practiceBibleRangeBtn").disabled = true;
      $("#bibleRangeSummary").textContent = bibleLoadState === "error" ? "본문을 불러오지 못했습니다. 위의 다시 불러오기를 눌러 주세요." : "본문을 불러오는 중입니다.";
      list.innerHTML = bibleLoadState === "error"
        ? `<div class="empty-state"><span>!</span><h3>공개 성경을 열지 못했어요</h3><p>앱을 웹서버로 열었는지 확인한 뒤 다시 불러와 주세요.</p></div>`
        : `<div class="empty-state"><span>◌</span><h3>성경 본문을 불러오는 중이에요</h3><p>잠시만 기다려 주세요.</p></div>`;
      return;
    }

    const visibleBooks = bibleTestament === "all" ? BIBLE_BOOKS : BIBLE_BOOKS.filter((book) => book.testament === bibleTestament);
    if (!visibleBooks.some((book) => book.code === bibleSelection.book)) bibleSelection.book = visibleBooks[0].code;
    const bookSelect = $("#bibleBookSelect");
    bookSelect.innerHTML = "";
    visibleBooks.forEach((book) => {
      const option = el("option", "", book.name);
      option.value = book.code;
      option.selected = book.code === bibleSelection.book;
      bookSelect.append(option);
    });

    const chapters = bibleData.books[bibleSelection.book] || [];
    bibleSelection.chapter = Math.max(1, Math.min(Number(bibleSelection.chapter) || 1, chapters.length));
    fillSelect($("#bibleChapterSelect"), Array.from({ length: chapters.length }, (_, index) => index + 1), bibleSelection.chapter);
    const verses = chapters[bibleSelection.chapter - 1] || [];
    bibleSelection.start = Math.max(1, Math.min(Number(bibleSelection.start) || 1, verses.length));
    bibleSelection.end = Math.max(bibleSelection.start, Math.min(Number(bibleSelection.end) || verses.length, verses.length));
    const verseNumbers = Array.from({ length: verses.length }, (_, index) => index + 1);
    fillSelect($("#bibleStartSelect"), verseNumbers, bibleSelection.start);
    fillSelect($("#bibleEndSelect"), verseNumbers, bibleSelection.end);
    $("#bibleModeSelect").value = preferredMode;

    const book = BIBLE_BOOK_BY_CODE[bibleSelection.book];
    const selectedCount = bibleSelection.end - bibleSelection.start + 1;
    $("#bibleRangeSummary").textContent = `${book.name} ${bibleSelection.chapter}:${bibleSelection.start}${selectedCount > 1 ? `–${bibleSelection.end}` : ""} · ${selectedCount}절 · ${MODE_NAMES[preferredMode]}`;
    $("#biblePreviewTitle").textContent = `${book.name} ${bibleSelection.chapter}장 미리보기`;
    $("#practiceWholeChapterBtn").disabled = !verses.length;
    $("#practiceBibleRangeBtn").disabled = !selectedCount;

    list.innerHTML = "";
    bibleRangeEntries(bibleSelection.book, bibleSelection.chapter, 1, verses.length).forEach((verse) => {
      const level = state.progress[verse.ref]?.level || 0;
      const selected = verse.verse >= bibleSelection.start && verse.verse <= bibleSelection.end;
      const row = el("article", `verse-row${selected ? " selected-passage" : ""}`);
      row.innerHTML = `<span class="reference">${verse.displayRef}</span><span class="text"></span><span class="mastery" aria-label="익숙함 ${level}/5">${[1,2,3,4,5].map((n) => `<i class="${n <= level ? "filled" : ""}"></i>`).join("")}</span><button class="icon-button verse-play" data-ref="${verse.ref}" aria-label="${verse.displayRef} 연습"><svg viewBox="0 0 24 24"><path d="m9 6 9 6-9 6V6Z"/></svg></button>`;
      $(".text", row).textContent = verse.text;
      list.append(row);
    });
  }

  function startBibleSelection(wholeChapter = false) {
    if (bibleLoadState !== "ready") return showToast("공개 성경 본문을 먼저 불러와 주세요.", "warn");
    const verses = bibleData.books[bibleSelection.book]?.[bibleSelection.chapter - 1] || [];
    const start = wholeChapter ? 1 : bibleSelection.start;
    const end = wholeChapter ? verses.length : bibleSelection.end;
    const entries = bibleRangeEntries(bibleSelection.book, bibleSelection.chapter, start, end);
    if (!entries.length) return showToast("선택한 범위에 본문이 없어요.", "warn");
    startGame(preferredMode, selectedRange, null, entries, "bible");
  }

  function renderImportUI() {
    $("#ephesiansImportCount").textContent = `${Object.keys(state.verses).length} / 155절`;
    $("#coreImportCount").textContent = `${Object.keys(state.coreVerses).length} / 12절`;
    $$(".import-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.importScope === importScope));
    const isEphesians = importScope === "ephesians";
    $("#verseInputLabel").textContent = isEphesians ? "에베소서 1–6장 전체 본문" : "복음의 온전성 핵심 12구절";
    $("#verseInput").placeholder = isEphesians
      ? "에베소서 1–6장 전체 본문을 그대로 붙여넣으세요."
      : "핵심 12구절 전체를 그대로 붙여넣으세요.";
    $("#replaceExistingLabel").hidden = !isEphesians;
    $("#saveVersesBtn").textContent = isEphesians ? "에베소서 전체 저장" : "핵심 12구절 저장";
  }

  function fillSelect(select, values, selected) {
    select.innerHTML = "";
    values.forEach((value) => {
      const option = el("option", "", String(value));
      option.value = value;
      option.selected = Number(value) === Number(selected);
      select.append(option);
    });
  }

  function renderWeeklyForm(fromControls = false) {
    const chapter = fromControls ? Number($("#weeklyChapter").value || state.weeklyPlan.chapter) : state.weeklyPlan.chapter;
    const start = fromControls ? Number($("#weeklyStart").value || state.weeklyPlan.start) : state.weeklyPlan.start;
    const end = fromControls ? Number($("#weeklyEnd").value || state.weeklyPlan.end) : state.weeklyPlan.end;
    fillSelect($("#weeklyChapter"), [1, 2, 3, 4, 5, 6], chapter);
    const verses = Array.from({ length: CHAPTER_COUNTS[chapter - 1] }, (_, index) => index + 1);
    fillSelect($("#weeklyStart"), verses, Math.min(start, verses.length));
    fillSelect($("#weeklyEnd"), verses, Math.min(Math.max(end, start), verses.length));
    const normalizedStart = Math.min(Number($("#weeklyStart").value), Number($("#weeklyEnd").value));
    const normalizedEnd = Math.max(Number($("#weeklyStart").value), Number($("#weeklyEnd").value));
    $("#weeklyRangeSummary").textContent = !fromControls && state.weeklyPlan.refs?.length
      ? `${weeklyLabel()} · ${weeklyRefs().length}절`
      : `에베소서 ${chapter}:${normalizedStart}–${normalizedEnd} · ${normalizedEnd - normalizedStart + 1}절`;
    $("#weeklyQuickInput").value = "";
    $("#weeklyQuickStatus").textContent = "예: 2:10–18";
  }

  function renderRecordingChecklist() {
    const coreDone = todayDoneFor(coreEntries());
    const weeklyDone = todayDoneFor(weeklyEntries());
    const cumulative = cumulativeEntries();
    const cumulativeDone = todayDoneFor(cumulative);
    $("#recordingChecklist").innerHTML = `
      <div><strong>핵심 12구절</strong>${coreDone}/12 연습</div>
      <div><strong>이번 주 진도</strong>${weeklyDone}/${weeklyRefs().length} 연습</div>
      <div><strong>누적 암송</strong>${cumulativeDone}/${cumulative.length} 연습</div>`;
  }

  function reminderTimePassed(time) {
    if (!/^\d{2}:\d{2}$/.test(time || "")) return false;
    const [hours, minutes] = time.split(":").map(Number);
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes() >= hours * 60 + minutes;
  }

  function overdueReminders() {
    if (!state.reminders.enabled) return [];
    const items = [];
    const weekly = weeklyEntries();
    const cumulative = cumulativeEntries();
    if (reminderTimePassed(state.reminders.weeklyTime) && todayDoneFor(weekly) < weeklyRefs().length) {
      items.push({ type: "weekly", title: "오늘의 새 진도가 남아 있어요", body: `${weeklyLabel()} · 입력한 ${weeklyRefs().length}절만 학습합니다.`, action: "weekly" });
    }
    if (cumulative.length && reminderTimePassed(state.reminders.cumulativeTime) && todayDoneFor(cumulative) < cumulative.length) {
      items.push({ type: "cumulative", title: "누적 암송 시간이에요", body: `이전 진도 ${cumulative.length}절을 처음부터 이어 암송해 보세요.`, action: "cumulative" });
    }
    if (reminderTimePassed(state.reminders.recordingTime) && !state.certifications[todayKey()]) {
      items.push({ type: "recording", title: "오늘의 녹음 인증이 아직 없어요", body: "짧게라도 소리 내어 암송하고 오늘의 녹음을 남겨주세요.", action: "recording" });
    }
    return items;
  }

  function renderReminderSettings() {
    const enabled = Boolean(state.reminders.enabled);
    const toggle = $("#reminderToggle");
    toggle.classList.toggle("on", enabled);
    toggle.setAttribute("aria-checked", String(enabled));
    $("span", toggle).textContent = enabled ? "켜짐" : "꺼짐";
    $("#weeklyReminderTime").value = state.reminders.weeklyTime;
    $("#cumulativeReminderTime").value = state.reminders.cumulativeTime;
    $("#recordingReminderTime").value = state.reminders.recordingTime;
    $$(".reminder-time-grid input").forEach((input) => { input.disabled = !enabled; });
    const permission = typeof Notification === "undefined" ? "unsupported" : Notification.permission;
    $("#reminderHelp").textContent = !enabled
      ? "알림을 켜면 크롬의 알림 권한을 요청합니다. 앱을 다시 열었을 때 놓친 알림도 확인해요."
      : permission === "granted"
        ? "크롬 알림과 앱 내부 알림이 켜졌어요. 브라우저가 닫혀 있던 동안의 미완료 항목은 다시 열 때 알려드려요."
        : "크롬 알림 권한이 없어 앱 화면 안에서 알려드려요. 주소창의 권한 설정에서 알림을 허용할 수 있습니다.";
  }

  function renderReminderBanner() {
    const reminder = overdueReminders()[0];
    const banner = $("#reminderBanner");
    banner.hidden = !reminder;
    currentReminderAction = reminder?.action || null;
    if (!reminder) return;
    $("#reminderBannerTitle").textContent = reminder.title;
    $("#reminderBannerText").textContent = reminder.body;
    $("#reminderActionBtn").textContent = reminder.type === "recording" ? "녹음하기" : "지금 암송";
  }

  function sendBrowserReminder(reminder) {
    showToast(reminder.title, "warn");
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const notification = new Notification(reminder.title, { body: reminder.body, icon: "./favicon.svg", tag: `memorize-${todayKey()}-${reminder.type}` });
    notification.addEventListener("click", () => { window.focus(); notification.close(); });
  }

  function checkReminders() {
    renderReminderBanner();
    if (!state.reminders.enabled) return;
    const today = todayKey();
    Object.keys(state.reminders.lastSent).filter((key) => !key.startsWith(today)).forEach((key) => delete state.reminders.lastSent[key]);
    let changed = false;
    overdueReminders().forEach((reminder) => {
      const key = `${today}:${reminder.type}`;
      if (state.reminders.lastSent[key]) return;
      state.reminders.lastSent[key] = new Date().toISOString();
      changed = true;
      sendBrowserReminder(reminder);
    });
    if (changed) saveState();
  }

  async function toggleReminders() {
    const willEnable = !state.reminders.enabled;
    state.reminders.enabled = willEnable;
    if (willEnable && typeof Notification !== "undefined" && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch { /* App reminders remain available. */ }
    }
    saveState();
    renderAll();
    checkReminders();
    showToast(willEnable ? "매일 암송 알림을 켰어요." : "매일 암송 알림을 껐어요.", willEnable ? "good" : "");
  }

  function saveReminderTime(type, value) {
    if (!/^\d{2}:\d{2}$/.test(value)) return;
    state.reminders[`${type}Time`] = value;
    delete state.reminders.lastSent[`${todayKey()}:${type}`];
    saveState();
    renderReminderSettings();
    checkReminders();
  }

  function switchView(view) {
    activeView = view;
    $$(".view").forEach((node) => node.classList.toggle("active", node.id === `${view}View`));
    $$(".nav-item[data-view]").forEach((node) => node.classList.toggle("active", node.dataset.view === view));
    const labels = {
      home: ["오늘, 말씀 곁에", "평안한 하루예요"],
      bible: ["WHOLE BIBLE · 66 BOOKS", "오늘 새길 말씀을 골라보세요"],
      library: ["MY VERSES · EPHESIANS", "말씀을 꺼내보세요"],
      mistakes: ["REVIEW NOTE", "틀린 부분을 다시 단단히 새겨요"],
      progress: ["SMALL STEPS", "꾸준히 잘 걷고 있어요"],
      team: ["TOGETHER IN THE WORD", "친구들과 함께 걸어가요"],
    };
    $("#pageEyebrow").textContent = labels[view][0];
    $("#pageTitle").textContent = labels[view][1];
    $(".sidebar").classList.remove("open");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (view === "team" && teamSession && !teamData) loadTeamDashboard();
  }

  function openModal(id) {
    const modal = $(id);
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => $("textarea, button:not(.modal-close), select", modal)?.focus(), 50);
  }

  function closeModal(modal) {
    if (modal?.id === "recordingModal" && mediaRecorder?.state === "recording") mediaRecorder.stop();
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    if (!$(".modal-backdrop.open") && !$("#gameOverlay").classList.contains("open")) document.body.style.overflow = "";
  }

  function showToast(message, type = "") {
    const toast = el("div", `toast ${type}`, message);
    $("#toastRegion").append(toast);
    setTimeout(() => toast.remove(), 3200);
  }

  function parseVerses(raw) {
    const results = {};
    const lines = raw.replace(/\r/g, "").split("\n");
    let currentRef = null;
    let currentChapter = null;
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const chapterHeading = trimmed.match(/^(?:개역개정\s*)?(?:에베소서\s*)?(?:제\s*)?([1-6])\s*장$/);
      if (chapterHeading) {
        currentChapter = Number(chapterHeading[1]);
        currentRef = null;
        return;
      }
      const match = trimmed.match(/^[\[(]?(?:(?:에베소서|엡)\s*)?(?:(\d)장\s*(\d{1,2})절|([1-6])\s*[:：]\s*(\d{1,2}))[\s\]).)-]*(.+)$/);
      if (match) {
        const chapter = Number(match[1] || match[3]);
        const verse = Number(match[2] || match[4]);
        const text = match[5].trim().replace(/^○\s*/, "");
        if (chapter >= 1 && chapter <= 6 && verse >= 1 && verse <= CHAPTER_COUNTS[chapter - 1] && text && !/^\[.*본문.*\]$/.test(text)) {
          currentChapter = chapter;
          currentRef = `${chapter}:${verse}`;
          results[currentRef] = text;
        }
      } else if (currentChapter) {
        const simpleVerse = trimmed.match(/^(\d{1,2})[\s.)]+(.+)$/);
        const verse = Number(simpleVerse?.[1]);
        const text = simpleVerse?.[2]?.trim().replace(/^○\s*/, "");
        if (simpleVerse && verse >= 1 && verse <= CHAPTER_COUNTS[currentChapter - 1] && text && !/^\[.*본문.*\]$/.test(text)) {
          currentRef = `${currentChapter}:${verse}`;
          results[currentRef] = text;
        } else if (currentRef) results[currentRef] += ` ${trimmed}`;
      } else if (currentRef) {
        results[currentRef] += ` ${trimmed}`;
      }
    });
    return results;
  }

  function parseCoreVerses(raw) {
    const results = {};
    const lines = raw.replace(/\r/g, "").split("\n");
    let currentId = null;
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(/^[\[(]?(골로새서|골|갈라디아서|갈|에베소서|엡|요한복음|요|빌립보서|빌)\s*(\d{1,2})(?:장)?\s*[:： ]\s*(\d{1,2})(?:절)?[\s\]).)-]*(.+)$/);
      if (match) {
        const [, bookAlias, chapterText, verseText, verseBody] = match;
        const passage = CORE_PASSAGES.find((item) => item.aliases.includes(bookAlias) && item.chapter === Number(chapterText) && item.verse === Number(verseText));
        if (passage && verseBody.trim() && !/^\[.*본문.*\]$/.test(verseBody.trim())) {
          currentId = passage.id;
          results[currentId] = verseBody.trim();
        }
      } else if (currentId) results[currentId] += ` ${trimmed}`;
    });
    return results;
  }

  function saveImportedVerses() {
    const parsed = importScope === "ephesians" ? parseVerses($("#verseInput").value) : parseCoreVerses($("#verseInput").value);
    const count = Object.keys(parsed).length;
    if (!count) {
      $("#parseStatus").textContent = "형식을 확인해 주세요.";
      showToast(importScope === "ephesians" ? "에베소서 장:절 형식을 인식하지 못했어요." : "지정된 핵심 12구절을 인식하지 못했어요.", "warn");
      return;
    }
    if (importScope === "ephesians") {
      if ($("#replaceExisting").checked) state.verses = parsed;
      else state.verses = { ...state.verses, ...parsed };
    } else state.coreVerses = { ...state.coreVerses, ...parsed };
    saveState();
    renderAll();
    $("#verseInput").value = "";
    $("#parseStatus").textContent = "아직 분석하지 않았어요";
    showToast(`${count}절을 이 브라우저에 저장했어요.`, "good");
    const personalEphesiansCount = Object.keys(state.verses).length;
    const personalCoreCount = Object.keys(state.coreVerses).length;
    if (personalEphesiansCount === 155 && personalCoreCount === 12) closeModal($("#importModal"));
    else if (importScope === "ephesians" && personalCoreCount < 12) {
      importScope = "core";
      renderImportUI();
      showToast("이제 핵심 12구절을 한 번에 등록해 주세요.");
    } else if (importScope === "core" && personalEphesiansCount < 155) {
      importScope = "ephesians";
      renderImportUI();
      showToast("이제 에베소서 1–6장 전체를 등록해 주세요.");
    }
  }

  function ensureVerses(next) {
    if (!verseEntries().length) {
      if (bibleLoadState === "loading") {
        showToast("공개 성경을 불러오는 중이에요. 잠시만 기다려 주세요.");
        return false;
      }
      openModal("#importModal");
      showToast("공개 본문을 불러오지 못했어요. 성경 전체 메뉴에서 다시 시도하거나 내 번역을 추가해 주세요.");
      return false;
    }
    next();
    return true;
  }

  function ensureCoreVerses(next) {
    if (coreEntries().length < CORE_PASSAGES.length) {
      if (bibleLoadState === "loading") {
        showToast("공개 성경을 불러오는 중이에요. 잠시만 기다려 주세요.");
        return false;
      }
      importScope = "core";
      renderImportUI();
      openModal("#importModal");
      showToast(`핵심 12구절 중 ${CORE_PASSAGES.length - coreEntries().length}절을 먼저 등록해 주세요.`);
      return false;
    }
    next();
    return true;
  }

  function ensureWeeklyVerses(next) {
    if (weeklyEntries().length < weeklyRefs().length) {
      if (bibleLoadState === "loading") {
        showToast("공개 성경을 불러오는 중이에요. 잠시만 기다려 주세요.");
        return false;
      }
      importScope = "ephesians";
      renderImportUI();
      openModal("#importModal");
      showToast("이번 주 진도를 위해 에베소서 전체 본문을 먼저 등록해 주세요.");
      return false;
    }
    next();
    return true;
  }

  function selectQueue(range = selectedRange, specificRef = null) {
    let pool = specificRef ? allEntries().filter((v) => v.ref === specificRef) : verseEntries().filter((v) => range.has(v.chapter));
    pool = pool.map((v) => ({ ...v, weight: 6 - (state.progress[v.ref]?.level || 0) + Math.random() * 2 }));
    pool.sort((a, b) => b.weight - a.weight);
    const goal = Math.min(Number(state.settings.dailyGoal || 5), pool.length);
    return pool.slice(0, specificRef ? 1 : goal);
  }

  function startGame(mode = preferredMode, range = selectedRange, specificRef = null, queueOverride = null, sessionType = "free") {
    preferredMode = mode;
    const queue = queueOverride ? [...queueOverride] : selectQueue(range, specificRef);
    if (!queue.length) return showToast("선택한 범위에 저장된 본문이 없어요.", "warn");
    game = { mode, queue, sessionType, index: 0, score: 0, checked: false, hintUsed: false, selectedTiles: [] };
    $("#gameOverlay").classList.add("open");
    $("#gameOverlay").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    renderChallenge();
  }

  function startPlan(plan) {
    if (plan === "core") return ensureCoreVerses(() => startGame(preferredMode, selectedRange, null, coreEntries(), "core"));
    if (plan === "core-continuous") return ensureCoreVerses(() => startGame("initial", selectedRange, null, coreEntries(), "core-continuous"));
    if (plan === "weekly") return ensureWeeklyVerses(() => startGame(preferredMode, selectedRange, null, weeklyEntries(), "weekly"));
    if (plan === "cumulative") {
      const entries = cumulativeEntries();
      if (!entries.length) return showToast("누적할 이전 주 진도가 아직 없어요.");
      return startGame(preferredMode, selectedRange, null, entries, "cumulative");
    }
  }

  function startMistakeReview(ref = null) {
    const items = mistakeEntries().filter((item) => !ref || item.entry.ref === ref);
    if (!items.length) return showToast("복습할 오답이 없어요.");
    const queue = items.flatMap(({ entry }) => [{ ...entry }, { ...entry }]);
    startGame(preferredMode, selectedRange, null, queue, "mistakes");
  }

  function currentVerse() { return game.queue[game.index]; }

  function renderChallenge() {
    game.checked = false;
    resetVoicePractice();
    game.hintUsed = false;
    game.hintLevel = 0;
    game.selectedTiles = [];
    game.blankWords = [];
    const verse = currentVerse();
    $("#gameModeLabel").textContent = game.sessionType === "core-continuous" ? "이어 암송 · 녹음" : MODE_NAMES[game.mode];
    $("#gameVerseRef").textContent = formatRef(verse.ref);
    $("#gameProgressText").textContent = `${game.index + 1} / ${game.queue.length}`;
    $("#gameProgressBar").style.width = `${(game.index / game.queue.length) * 100}%`;
    $("#gameScore").textContent = game.score;
    $("#gameFeedback").className = "game-feedback";
    $("#gameFeedback").textContent = "";
    $("#checkAnswerBtn").textContent = game.sessionType === "core-continuous" ? "인식 결과 채점" : "정답 확인";
    $("#hintBtn").style.visibility = "visible";
    $("#hintBtn").disabled = false;
    $("#hintBtn").textContent = game.mode === "blank" ? "한 글자씩 보기" : "전체 구절 보기";
    const area = $("#challengeArea");
    area.innerHTML = "";
    if (game.mode === "blank") buildBlankChallenge(area, verse.text);
    if (game.mode === "initial") buildInitialChallenge(area, verse.text);
    if (game.mode === "order") buildOrderChallenge(area, verse.text);
  }

  function speechRecognitionConstructor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function isMobileBrowser() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  function combinedVoiceTranscript() {
    return [voiceFinalTranscript, voiceInterimTranscript].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  function setVoiceStatus(message, tone = "") {
    const status = $("#voiceStatus");
    status.textContent = message;
    status.className = tone;
  }

  function setVoiceButtons() {
    const supported = Boolean(speechRecognitionConstructor());
    $("#voiceStartBtn").disabled = !supported || Boolean(game?.checked);
    $("#voiceStartBtn").textContent = supported ? (voiceListening ? "음성인식 멈춤" : "음성인식 시작") : "이 브라우저에서는 미지원";
    $("#voiceGradeBtn").disabled = !supported || !combinedVoiceTranscript() || Boolean(game?.checked);
    $("#voicePractice").classList.toggle("listening", voiceListening);
  }

  function renderVoiceTranscript() {
    const panel = $("#voiceTranscript");
    const output = $("#voiceTranscriptText");
    const transcript = combinedVoiceTranscript();
    panel.hidden = !transcript && !voiceListening;
    output.innerHTML = "";
    if (!transcript) {
      output.textContent = "말씀을 기다리고 있어요…";
      setVoiceButtons();
      return;
    }
    const normalizedActual = normalize(transcript);
    const expected = normalize(currentVerse().text).slice(0, normalizedActual.length);
    const diff = buildCharacterDiff({ normalizedActual, normalizedExpected: expected });
    let operationIndex = 0;
    [...transcript].forEach((char) => {
      if (!normalize(char)) {
        output.append(document.createTextNode(char));
        return;
      }
      const operation = diff.actualOps[operationIndex];
      operationIndex += 1;
      if (operation?.type === "extra") output.append(el("mark", "voice-wrong", char));
      else output.append(el("span", "voice-match", char));
    });
    if (voiceInterimTranscript) output.append(el("span", "voice-interim-note", " · 인식 중"));
    if (game?.mode === "initial") {
      const input = $(".recall-input");
      if (input) input.value = transcript;
    }
    setVoiceButtons();
  }

  async function prepareVoiceAudio() {
    if (!$("#voiceSoundToggle").checked) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    voiceAudioContext ||= new AudioContextClass();
    if (voiceAudioContext.state === "suspended") await voiceAudioContext.resume();
  }

  function playVoiceMistakeSound() {
    if (!$("#voiceSoundToggle").checked || !voiceAudioContext) return;
    const oscillator = voiceAudioContext.createOscillator();
    const gain = voiceAudioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(330, voiceAudioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(190, voiceAudioContext.currentTime + .22);
    gain.gain.setValueAtTime(.12, voiceAudioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, voiceAudioContext.currentTime + .24);
    oscillator.connect(gain).connect(voiceAudioContext.destination);
    oscillator.start();
    oscillator.stop(voiceAudioContext.currentTime + .25);
  }

  function confirmedVoiceMismatch() {
    const spoken = normalize(voiceFinalTranscript);
    return Boolean(spoken) && !normalize(currentVerse().text).startsWith(spoken);
  }

  function stopVoiceRecognition(message = "음성인식을 멈췄어요.") {
    voiceListening = false;
    const activeRecognition = voiceRecognition;
    voiceRecognition = null;
    voiceRecognitionId += 1;
    try { activeRecognition?.stop(); } catch { /* already stopped */ }
    if (message) setVoiceStatus(message);
    setVoiceButtons();
  }

  function resetVoicePractice() {
    stopVoiceRecognition("");
    voiceFinalTranscript = "";
    voiceInterimTranscript = "";
    voiceMismatchAnnounced = false;
    $("#voiceTranscript").hidden = true;
    $("#voiceTranscriptText").textContent = "말씀을 기다리고 있어요…";
    const supported = Boolean(speechRecognitionConstructor());
    setVoiceStatus(supported ? "마이크를 누르고 말씀을 소리 내어 보세요." : "최신 Chrome에서 음성인식을 사용할 수 있어요.", supported ? "" : "warn");
    setVoiceButtons();
  }

  async function toggleVoiceRecognition() {
    if (voiceListening) {
      stopVoiceRecognition("인식된 말씀을 확인한 뒤 채점해 주세요.");
      return;
    }
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) return showToast("이 브라우저에서는 실시간 음성인식을 지원하지 않아요. 최신 Chrome을 사용해 주세요.", "warn");
    voiceFinalTranscript = "";
    voiceInterimTranscript = "";
    voiceMismatchAnnounced = false;
    renderVoiceTranscript();
    try { await prepareVoiceAudio(); } catch { /* sound remains optional */ }
    if (game?.sessionType === "core-continuous" && !await startContinuousRecording()) return;
    const recognition = new Recognition();
    const recognitionId = ++voiceRecognitionId;
    voiceRecognition = recognition;
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = !isMobileBrowser();
    recognition.maxAlternatives = 1;
    voiceListening = true;
    setVoiceStatus("마이크를 연결하고 있어요…", "active");
    setVoiceButtons();
    recognition.onstart = () => {
      if (recognitionId !== voiceRecognitionId) return;
      voiceListening = true;
      setVoiceStatus("듣고 있어요. 말씀을 천천히 암송하세요.", "active");
      renderVoiceTranscript();
    };
    recognition.onresult = (event) => {
      if (recognitionId !== voiceRecognitionId || !game || game.checked) return;
      let finalText = "";
      let interimText = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const text = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) finalText += `${text} `;
        else interimText += `${text} `;
      }
      voiceFinalTranscript = finalText.trim();
      voiceInterimTranscript = interimText.trim();
      renderVoiceTranscript();
      if (game.sessionType === "core-continuous" && voiceFinalTranscript) {
        const grading = gradeRecitation(voiceFinalTranscript, currentVerse().text);
        if (grading.exact || grading.near) {
          finishAnswer(grading);
          clearTimeout(continuousAdvanceTimerId);
          continuousAdvanceTimerId = setTimeout(() => {
            nextChallenge();
            if (game?.sessionType === "core-continuous") toggleVoiceRecognition();
          }, 650);
          return;
        }
      }
      if (!voiceMismatchAnnounced && confirmedVoiceMismatch()) {
        voiceMismatchAnnounced = true;
        playVoiceMistakeSound();
        if ($("#voiceStopToggle").checked) {
          stopVoiceRecognition("다른 말씀이 인식되어 자동으로 멈췄어요.");
          showToast("틀린 부분을 빨간색으로 확인해 보세요.", "warn");
        } else {
          setVoiceStatus("다른 말씀이 감지됐어요. 빨간 글자를 확인하세요.", "warn");
        }
      }
    };
    recognition.onerror = (event) => {
      if (recognitionId !== voiceRecognitionId) return;
      const messages = {
        "not-allowed": "마이크 권한을 허용해 주세요.",
        "service-not-allowed": "브라우저의 음성인식 사용이 차단되어 있어요.",
        "no-speech": "음성이 들리지 않았어요. 다시 시작해 주세요.",
        network: "음성인식 서비스에 연결하지 못했어요.",
      };
      stopVoiceRecognition(messages[event.error] || "음성인식을 계속할 수 없어요.");
      showToast(messages[event.error] || "음성인식 오류가 발생했어요.", "warn");
    };
    recognition.onend = () => {
      if (recognitionId !== voiceRecognitionId) return;
      voiceListening = false;
      voiceRecognition = null;
      setVoiceStatus(combinedVoiceTranscript() ? "인식된 말씀을 확인한 뒤 채점해 주세요." : "음성인식이 멈췄어요. 다시 시작해 주세요.");
      setVoiceButtons();
    };
    try { recognition.start(); } catch { stopVoiceRecognition("음성인식을 시작하지 못했어요."); showToast("음성인식을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.", "warn"); }
  }

  function gradeVoiceAnswer() {
    const transcript = combinedVoiceTranscript();
    if (!transcript) return showToast("먼저 말씀을 음성으로 암송해 주세요.");
    stopVoiceRecognition("음성 답안을 채점했어요.");
    finishAnswer(gradeRecitation(transcript, currentVerse().text));
  }

  function tokenize(text) {
    return text.trim().split(/\s+/).filter(Boolean);
  }

  function buildBlankChallenge(area, text) {
    $("#gamePrompt").textContent = "빈칸에 들어갈 말을 떠올려 보세요.";
    const words = tokenize(text);
    const blankCount = Math.max(1, Math.min(5, Math.ceil(words.length * .28)));
    const candidates = words.map((word, i) => ({ word, i })).filter(({ word }) => normalize(word).length >= 2);
    candidates.sort(() => Math.random() - .5);
    const hidden = new Set(candidates.slice(0, blankCount).map((v) => v.i));
    if (!hidden.size) hidden.add(Math.floor(words.length / 2));
    game.blankWords = [...words];
    const verseLine = el("div", "blank-verse");
    words.forEach((word, index) => {
      if (hidden.has(index)) {
        const input = el("input", `blank-input${normalize(word).length > 4 ? " wide" : ""}`);
        input.dataset.answer = word;
        input.dataset.wordIndex = index;
        input.setAttribute("aria-label", `${index + 1}번째 빈칸`);
        input.autocomplete = "off";
        verseLine.append(input);
      } else verseLine.append(document.createTextNode(word));
      verseLine.append(document.createTextNode(" "));
    });
    area.append(verseLine);
    $(".blank-input", area)?.focus();
  }

  function revealWordFirstCharacter(word) {
    let revealed = false;
    return [...word].map((char) => {
      if (!revealed && /[가-힣A-Za-z0-9]/.test(char)) {
        revealed = true;
        return char;
      }
      return /[가-힣A-Za-z0-9]/.test(char) ? "·" : char;
    }).join("");
  }

  function wordFirstGuide(text) {
    return text.split(/(\s+)/).map((part) => /^\s+$/.test(part) ? part : revealWordFirstCharacter(part)).join("");
  }

  function buildInitialChallenge(area, text) {
    $("#gamePrompt").textContent = "각 단어의 첫 글자를 따라 말씀을 적어보세요.";
    const hint = el("div", "initial-hint", wordFirstGuide(text));
    const input = el("textarea", "recall-input");
    input.placeholder = "기억나는 대로 천천히 적어보세요…";
    input.dataset.answer = text;
    area.append(hint, input);
    input.focus();
  }

  function chunksFor(text) {
    const words = tokenize(text);
    const size = words.length > 18 ? 4 : words.length > 10 ? 3 : 2;
    const chunks = [];
    for (let i = 0; i < words.length; i += size) chunks.push(words.slice(i, i + size).join(" "));
    return chunks;
  }

  function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    if (result.length > 1 && result.every((v, i) => v === items[i])) [result[0], result[1]] = [result[1], result[0]];
    return result;
  }

  function buildOrderChallenge(area, text) {
    $("#gamePrompt").textContent = "흩어진 말씀 조각을 순서대로 이어보세요.";
    game.orderAnswer = chunksFor(text);
    const answer = el("div", "order-answer");
    answer.setAttribute("aria-label", "선택한 말씀 조각");
    const bank = el("div", "order-bank");
    shuffled(game.orderAnswer).forEach((chunk, index) => {
      const button = el("button", "word-tile", chunk);
      button.dataset.chunk = chunk;
      button.dataset.tileId = index;
      bank.append(button);
    });
    area.append(answer, bank);
  }

  function checkChallenge() {
    if (game.checked) return nextChallenge();
    const expected = currentVerse().text;
    let actual = "";
    if (game.mode === "blank") {
      const inputs = $$(".blank-input", $("#challengeArea"));
      if (inputs.some((input) => !input.value.trim())) return showToast("빈칸을 모두 채워주세요.");
      const actualWords = [...game.blankWords];
      inputs.forEach((input) => {
        actualWords[Number(input.dataset.wordIndex)] = input.value;
        input.classList.toggle("incorrect", normalize(input.value) !== normalize(input.dataset.answer));
      });
      actual = actualWords.join(" ");
    } else if (game.mode === "initial") {
      const input = $(".recall-input");
      if (!input.value.trim()) return showToast("기억나는 말씀을 먼저 적어주세요.");
      actual = input.value;
    } else {
      if (game.selectedTiles.length !== game.orderAnswer.length) return showToast("말씀 조각을 모두 골라주세요.");
      actual = game.selectedTiles.map((tile) => tile.chunk).join(" ");
    }
    finishAnswer(gradeRecitation(actual, expected));
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    const longer = a.length >= b.length ? a : b;
    const shorter = a.length < b.length ? a : b;
    const dp = Array(shorter.length + 1).fill(0);
    for (let i = 1; i <= longer.length; i++) {
      let previous = 0;
      for (let j = 1; j <= shorter.length; j++) {
        const temp = dp[j];
        dp[j] = longer[i - 1] === shorter[j - 1] ? previous + 1 : Math.max(dp[j], dp[j - 1]);
        previous = temp;
      }
    }
    return dp[shorter.length] / longer.length;
  }

  function gradeRecitation(actual, expected) {
    const normalizedActual = normalize(actual);
    const normalizedExpected = normalize(expected);
    const exact = normalizedActual === normalizedExpected;
    const ratio = exact ? 1 : similarity(normalizedActual, normalizedExpected);
    return { actual, expected, normalizedActual, normalizedExpected, exact, ratio, near: !exact && ratio >= .96 };
  }

  function buildCharacterDiff(grading) {
    const expected = [...grading.normalizedExpected];
    const actual = [...grading.normalizedActual];
    const dp = Array.from({ length: expected.length + 1 }, () => new Uint16Array(actual.length + 1));
    for (let i = expected.length - 1; i >= 0; i -= 1) {
      for (let j = actual.length - 1; j >= 0; j -= 1) {
        dp[i][j] = expected[i] === actual[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const expectedOps = [];
    const actualOps = [];
    let i = 0;
    let j = 0;
    while (i < expected.length || j < actual.length) {
      if (i < expected.length && j < actual.length && expected[i] === actual[j]) {
        expectedOps.push({ char: expected[i], type: "same" });
        actualOps.push({ char: actual[j], type: "same" });
        i += 1; j += 1;
      } else if (i < expected.length && (j >= actual.length || dp[i + 1][j] >= dp[i][j + 1])) {
        expectedOps.push({ char: expected[i], type: "missing" });
        i += 1;
      } else if (j < actual.length) {
        actualOps.push({ char: actual[j], type: "extra" });
        j += 1;
      }
    }
    return { expectedOps, actualOps };
  }

  function appendDiffLine(container, label, operations, highlightType, emptyText = "입력 없음") {
    const row = el("div", "answer-diff-row");
    row.append(el("strong", "", label));
    const text = el("span", "answer-diff-text");
    if (!operations.length) text.textContent = emptyText;
    operations.forEach((operation) => {
      if (operation.type === highlightType) text.append(el("mark", operation.type, operation.char));
      else text.append(document.createTextNode(operation.char));
    });
    row.append(text);
    container.append(row);
  }

  function renderAnswerFeedback(feedback, grading, points, mistakeStatus) {
    feedback.innerHTML = "";
    const title = el("strong", "feedback-title");
    if (grading.exact) {
      title.textContent = `정확해요. ${points}점을 얻었습니다.`;
      feedback.append(title);
      if (mistakeStatus?.cleared) feedback.append(el("p", "feedback-note", "두 번 연속 정확해서 오답노트에서 완료했어요."));
      else if (mistakeStatus?.hinted) feedback.append(el("p", "feedback-note", "정확하지만 힌트를 사용해 오답노트 연속 기록에는 포함하지 않았어요."));
      else if (mistakeStatus?.streak) feedback.append(el("p", "feedback-note", `오답노트 완료까지 힌트 없이 ${2 - mistakeStatus.streak}번 더 정확하면 돼요.`));
      return;
    }
    title.textContent = grading.near ? `거의 정확해요. 다른 글자를 오답노트에 저장했습니다. +${points}점` : `다른 글자가 있어요. 오답노트에 저장했습니다. +${points}점`;
    feedback.append(title, el("p", "feedback-note", "띄어쓰기와 문장부호는 이미 제외했습니다. 색칠된 실제 글자만 다시 소리 내어 보세요."));
    const fullAnswer = el("div", "answer-full");
    const expectedLine = el("p"); expectedLine.append(el("strong", "", "정답 "), document.createTextNode(grading.expected));
    const actualLine = el("p"); actualLine.append(el("strong", "", "내 답 "), document.createTextNode(grading.actual || "입력 없음"));
    fullAnswer.append(expectedLine, actualLine);
    feedback.append(fullAnswer);
    const diff = buildCharacterDiff(grading);
    const diffBox = el("div", "answer-diff");
    appendDiffLine(diffBox, "빠진·다른 글자", diff.expectedOps, "missing");
    appendDiffLine(diffBox, "더 입력한 글자", diff.actualOps, "extra");
    feedback.append(diffBox);
  }

  function updateMistakeNote(verse, grading) {
    const existing = state.mistakes[verse.ref];
    if (!grading.exact) {
      state.mistakes[verse.ref] = {
        count: (existing?.count || 0) + 1,
        correctStreak: 0,
        lastActual: grading.actual,
        expected: verse.text,
        similarity: grading.ratio,
        lastMistakeAt: new Date().toISOString(),
      };
      return { saved: true };
    }
    if (!existing) return null;
    if (game.hintUsed) return { hinted: true, streak: existing.correctStreak || 0 };
    const streak = (existing.correctStreak || 0) + 1;
    if (streak >= 2) {
      delete state.mistakes[verse.ref];
      return { cleared: true };
    }
    state.mistakes[verse.ref] = { ...existing, correctStreak: streak, lastCorrectAt: new Date().toISOString() };
    return { streak };
  }

  function finishAnswer(grading) {
    stopVoiceRecognition("");
    const verse = currentVerse();
    game.checked = true;
    const correct = grading.exact;
    const points = correct ? (game.hintUsed ? 75 : 100) : grading.near ? Math.max(60, Math.round(grading.ratio * 70)) : Math.max(20, Math.round(grading.ratio * 55));
    game.score += points;
    const mistakeStatus = updateMistakeNote(verse, grading);
    const prior = state.progress[verse.ref] || { level: 0, attempts: 0 };
    state.progress[verse.ref] = {
      level: Math.max(0, Math.min(5, prior.level + (correct ? 1 : -1))),
      attempts: prior.attempts + 1,
      lastPracticed: new Date().toISOString(),
    };
    state.history.push({ ref: verse.ref, mode: game.mode, sessionType: game.sessionType, correct, points, similarity: grading.ratio, date: todayKey(), at: new Date().toISOString() });
    state.history = state.history.slice(-500);
    state.lastSession = { ref: verse.ref, mode: game.mode };
    saveState();
    $("#gameScore").textContent = game.score;
    const feedback = $("#gameFeedback");
    feedback.className = `game-feedback show ${correct ? "correct" : "wrong"}`;
    renderAnswerFeedback(feedback, grading, points, mistakeStatus);
    $("#checkAnswerBtn").textContent = game.index === game.queue.length - 1 ? "연습 마치기" : "다음 말씀";
    $("#hintBtn").style.visibility = "hidden";
    setVoiceButtons();
  }

  function nextChallenge() {
    if (game.index < game.queue.length - 1) {
      game.index += 1;
      renderChallenge();
    } else endGame();
  }

  function endGame() {
    stopVoiceRecognition("");
    clearTimeout(continuousAdvanceTimerId);
    if (game?.sessionType === "core-continuous" && mediaRecorder?.state === "recording") mediaRecorder.stop();
    const finalScore = game.score;
    const count = game.queue.length;
    const sessionType = game.sessionType;
    $("#gameOverlay").classList.remove("open");
    $("#gameOverlay").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    game = null;
    renderAll();
    const nextMessages = {
      core: "핵심 12구절 완료 · 이번 주 새 진도로 이어가세요.",
      "core-continuous": "핵심 12구절 이어 암송과 녹음이 완료됐어요.",
      weekly: "새 진도 완료 · 이전 말씀 누적 암송으로 이어가세요.",
      cumulative: "누적 암송 완료 · 녹음 인증으로 마무리해 보세요.",
      mistakes: "오답 반복학습을 마쳤어요. 남은 구절을 확인해 보세요.",
    };
    showToast(nextMessages[sessionType] || `${count}절 연습 완료 · ${finalScore}점`, "good");
    switchView(sessionType === "mistakes" ? "mistakes" : sessionType === "free" ? "progress" : "home");
  }

  function showHint() {
    const verse = currentVerse();
    game.hintUsed = true;
    if (game.mode === "blank" && game.hintLevel === 0) {
      $$(".blank-input").forEach((input) => { input.placeholder = revealWordFirstCharacter(input.dataset.answer); });
      game.hintLevel = 1;
      $("#hintBtn").textContent = "전체 구절 보기";
      showToast("각 빈칸의 실제 첫 글자를 보여드렸어요.");
      return;
    }
    let fullHint = $(".full-verse-hint", $("#challengeArea"));
    if (!fullHint) {
      fullHint = el("div", "full-verse-hint");
      $("#challengeArea").prepend(fullHint);
    }
    fullHint.textContent = verse.text;
    game.hintLevel = 2;
    $("#hintBtn").textContent = "전체 구절 확인함";
    $("#hintBtn").disabled = true;
    showToast("전체 구절을 펼쳐드렸어요.");
  }

  function parseWeeklyRangeInput(raw) {
    const compact = raw.trim().replace(/\s+/g, " ");
    const match = compact.match(/^(?:(?:에베소서|엡)\s*)?([1-6])(?:장)?\s*[:：]\s*(\d{1,2})(?:\s*[~～–—-]\s*(\d{1,2}))?\s*(?:절)?$/);
    if (!match) return [];
    const chapter = Number(match[1]);
    const start = Number(match[2]);
    const end = Number(match[3] || match[2]);
    if (start < 1 || end < start || end > CHAPTER_COUNTS[chapter - 1]) return [];
    return weeklyRefs({ chapter, start, end, refs: [] });
  }

  function previewWeeklyInput(raw) {
    const rangeRefs = parseWeeklyRangeInput(raw);
    if (rangeRefs.length) return { refs: rangeRefs, verses: {} };
    const verses = parseVerses(raw);
    return { refs: Object.keys(verses).sort((a, b) => {
      const [aChapter, aVerse] = a.split(":").map(Number);
      const [bChapter, bVerse] = b.split(":").map(Number);
      return aChapter - bChapter || aVerse - bVerse;
    }), verses };
  }

  function setWeeklyPassage(refs, importedVerses = {}) {
    const normalizedRefs = [...new Set(refs)];
    if (!normalizedRefs.length) return false;
    const previous = weeklyRefs();
    const changed = previous.join("|") !== normalizedRefs.join("|");
    if (changed) state.cumulativeRefs = [...new Set([...state.cumulativeRefs, ...previous])];
    state.verses = { ...state.verses, ...importedVerses };
    const [firstChapter, firstVerse] = normalizedRefs[0].split(":").map(Number);
    const [, lastVerse] = normalizedRefs[normalizedRefs.length - 1].split(":").map(Number);
    state.weeklyPlan = { chapter: firstChapter, start: firstVerse, end: lastVerse, refs: normalizedRefs };
    saveState();
    renderAll();
    return true;
  }

  function applyWeeklyInput() {
    const result = previewWeeklyInput($("#weeklyQuickInput").value);
    if (!result.refs.length) {
      $("#weeklyQuickStatus").textContent = "범위 또는 장:절 본문 형식을 확인해 주세요.";
      return showToast("새 진도 분량을 인식하지 못했어요.", "warn");
    }
    setWeeklyPassage(result.refs, result.verses);
    closeModal($("#weeklyModal"));
    showToast(`${weeklyLabel()} ${result.refs.length}절만 새 진도로 설정했어요.`, "good");
  }

  function saveWeeklyPlan() {
    const chapter = Number($("#weeklyChapter").value);
    const start = Math.min(Number($("#weeklyStart").value), Number($("#weeklyEnd").value));
    const end = Math.max(Number($("#weeklyStart").value), Number($("#weeklyEnd").value));
    const previous = weeklyRefs();
    const nextRefs = weeklyRefs({ chapter, start, end, refs: [] });
    const unchanged = previous.join("|") === nextRefs.join("|");
    if (unchanged) {
      closeModal($("#weeklyModal"));
      return showToast("현재와 같은 주간 진도예요.");
    }
    state.cumulativeRefs = [...new Set([...state.cumulativeRefs, ...previous])];
    state.weeklyPlan = { chapter, start, end, refs: nextRefs };
    saveState();
    renderAll();
    closeModal($("#weeklyModal"));
    showToast(`새 진도를 에베소서 ${chapter}:${start}–${end}로 설정했어요.`, "good");
  }

  function addCumulativeRange() {
    const chapter = Number($("#weeklyChapter").value);
    const start = Math.min(Number($("#weeklyStart").value), Number($("#weeklyEnd").value));
    const end = Math.max(Number($("#weeklyStart").value), Number($("#weeklyEnd").value));
    const refs = weeklyRefs({ chapter, start, end });
    state.cumulativeRefs = [...new Set([...state.cumulativeRefs, ...refs])];
    saveState();
    renderAll();
    closeModal($("#weeklyModal"));
    showToast(`에베소서 ${chapter}:${start}–${end}을 누적 암송에 추가했어요.`, "good");
  }

  function updateWeeklyControls(chapterChanged = false) {
    const chapter = Number($("#weeklyChapter").value);
    if (chapterChanged) {
      const verses = Array.from({ length: CHAPTER_COUNTS[chapter - 1] }, (_, index) => index + 1);
      fillSelect($("#weeklyStart"), verses, Math.min(state.weeklyPlan.start, verses.length));
      fillSelect($("#weeklyEnd"), verses, Math.min(state.weeklyPlan.end, verses.length));
    }
    let start = Number($("#weeklyStart").value);
    let end = Number($("#weeklyEnd").value);
    if (end < start) {
      end = start;
      $("#weeklyEnd").value = String(end);
    }
    $("#weeklyRangeSummary").textContent = `에베소서 ${chapter}:${start}–${end} · ${end - start + 1}절`;
  }

  function resetRecordingResult() {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    recordingUrl = null;
    recordingBlob = null;
    $("#recordingPreview").hidden = true;
    $("#recordingPreview").removeAttribute("src");
    $("#downloadRecording").removeAttribute("href");
    $("#downloadRecording").classList.add("disabled");
    $("#shareRecordingBtn").disabled = true;
    $("#uploadTeamRecordingBtn").disabled = true;
  }

  function stopRecordingTracks() {
    if (recordingStream) recordingStream.getTracks().forEach((track) => track.stop());
    recordingStream = null;
    if (recordingTimerId) clearInterval(recordingTimerId);
    recordingTimerId = null;
  }

  function completeRecording() {
    recordingBlob = new Blob(recordingChunks, { type: mediaRecorder?.mimeType || "audio/webm" });
    recordingUrl = URL.createObjectURL(recordingBlob);
    const preview = $("#recordingPreview");
    preview.src = recordingUrl;
    preview.hidden = false;
    $("#downloadRecording").href = recordingUrl;
    $("#downloadRecording").download = `암송인증-${todayKey()}.webm`;
    $("#downloadRecording").classList.remove("disabled");
    $("#shareRecordingBtn").disabled = !navigator.share;
    $("#uploadTeamRecordingBtn").hidden = !teamSession;
    $("#uploadTeamRecordingBtn").disabled = !teamSession;
    $("#useLatestRecordingBtn").disabled = false;
    $("#recordingOrb").classList.remove("recording");
    $("#recordingState").textContent = "녹음 완료";
    $("#recordButton").innerHTML = '<span class="record-dot"></span> 다시 녹음';
    stopRecordingTracks();
    const now = new Date();
    state.certifications[todayKey()] = { at: now.toISOString(), time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}` };
    saveState();
    renderAll();
    showToast("오늘의 암송 인증을 기록했어요.", "good");
  }

  async function startContinuousRecording() {
    if (mediaRecorder?.state === "recording") return true;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      showToast("이 브라우저에서는 녹음을 지원하지 않아요. 최신 크롬을 사용해 주세요.", "warn");
      return false;
    }
    try {
      resetRecordingResult();
      recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingChunks = [];
      mediaRecorder = new MediaRecorder(recordingStream);
      mediaRecorder.addEventListener("dataavailable", (event) => { if (event.data.size) recordingChunks.push(event.data); });
      mediaRecorder.addEventListener("stop", completeRecording, { once: true });
      mediaRecorder.start();
      recordingStartedAt = Date.now();
      updateRecordingTimer();
      recordingTimerId = setInterval(updateRecordingTimer, 500);
      $("#recordingState").textContent = "이어 암송 녹음 중…";
      return true;
    } catch (error) {
      stopRecordingTracks();
      showToast(error?.name === "NotAllowedError" ? "마이크 권한을 허용해 주세요." : "마이크를 시작하지 못했어요.", "warn");
      return false;
    }
  }

  function updateRecordingTimer() {
    const seconds = Math.floor((Date.now() - recordingStartedAt) / 1000);
    const minutesText = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secondsText = String(seconds % 60).padStart(2, "0");
    $("#recordingTimer").textContent = `${minutesText}:${secondsText}`;
  }

  async function toggleRecording() {
    if (mediaRecorder?.state === "recording") {
      mediaRecorder.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      showToast("이 브라우저에서는 녹음을 지원하지 않아요. 최신 크롬을 사용해 주세요.", "warn");
      return;
    }
    try {
      resetRecordingResult();
      recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingChunks = [];
      mediaRecorder = new MediaRecorder(recordingStream);
      mediaRecorder.addEventListener("dataavailable", (event) => { if (event.data.size) recordingChunks.push(event.data); });
      mediaRecorder.addEventListener("stop", completeRecording, { once: true });
      mediaRecorder.start();
      recordingStartedAt = Date.now();
      updateRecordingTimer();
      recordingTimerId = setInterval(updateRecordingTimer, 500);
      $("#recordingOrb").classList.add("recording");
      $("#recordingState").textContent = "녹음 중…";
      $("#recordButton").innerHTML = '<span class="record-dot"></span> 녹음 마치기';
    } catch (error) {
      stopRecordingTracks();
      showToast(error?.name === "NotAllowedError" ? "마이크 권한을 허용해 주세요." : "마이크를 시작하지 못했어요.", "warn");
    }
  }

  async function shareRecording() {
    if (!recordingBlob || !navigator.share) return;
    const file = new File([recordingBlob], `암송인증-${todayKey()}.webm`, { type: recordingBlob.type });
    try {
      if (navigator.canShare && !navigator.canShare({ files: [file] })) throw new Error("files-not-supported");
      await navigator.share({ title: "오늘의 암송 인증", text: "오늘의 말씀 암송 인증입니다.", files: [file] });
    } catch (error) {
      if (error?.name !== "AbortError") showToast("공유가 지원되지 않아 파일로 저장해 주세요.", "warn");
    }
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `마음에새김-백업-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed.verses !== "object") throw new Error();
        state = {
          ...structuredClone(defaultState), ...parsed,
          settings: { ...defaultState.settings, ...(parsed.settings || {}) },
          weeklyPlan: { ...defaultState.weeklyPlan, ...(parsed.weeklyPlan || {}) },
          verses: parsed.verses || {}, coreVerses: parsed.coreVerses || {},
          cumulativeRefs: parsed.cumulativeRefs || [], certifications: parsed.certifications || {},
          reminders: { ...defaultState.reminders, ...(parsed.reminders || {}), lastSent: parsed.reminders?.lastSent || {} },
          progress: parsed.progress || {}, history: parsed.history || [], mistakes: parsed.mistakes || {},
        };
        saveState();
        renderAll();
        closeModal($("#settingsModal"));
        showToast("백업을 안전하게 불러왔어요.", "good");
      } catch { showToast("올바른 백업 파일이 아니에요.", "warn"); }
    };
    reader.readAsText(file);
  }

  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) switchView(viewButton.dataset.view);
    const closeButton = event.target.closest("[data-close-modal]");
    if (closeButton) closeModal(closeButton.closest(".modal-backdrop"));
    if (event.target.classList.contains("modal-backdrop")) closeModal(event.target);
    const chapterTab = event.target.closest(".chapter-tab");
    if (chapterTab) { libraryChapter = chapterTab.dataset.chapter; renderLibrary(); }
    if (event.target.closest(".empty-import")) { renderImportUI(); openModal("#importModal"); }
    const importTab = event.target.closest(".import-tab");
    if (importTab) {
      importScope = importTab.dataset.importScope;
      $("#verseInput").value = "";
      $("#parseStatus").textContent = "아직 분석하지 않았어요";
      renderImportUI();
    }
    const scopeButton = event.target.closest("[data-practice-scope]");
    if (scopeButton && !scopeButton.disabled) {
      practiceScope = scopeButton.dataset.practiceScope;
      renderRange();
    }
    const testamentButton = event.target.closest("#testamentFilter [data-testament]");
    if (testamentButton) {
      bibleTestament = testamentButton.dataset.testament;
      renderBibleView();
    }
    const modeCard = event.target.closest(".mode-card");
    if (modeCard) ensureVerses(() => openPracticeRange(modeCard.dataset.mode));
    const planButton = event.target.closest("[data-plan]");
    if (planButton && !planButton.disabled) startPlan(planButton.dataset.plan);
    const versePlay = event.target.closest(".verse-play");
    if (versePlay) {
      const parsed = parseBibleRef(versePlay.dataset.ref);
      if (parsed) {
        const entry = bibleEntry(parsed.book, parsed.chapter, parsed.verse);
        if (entry) startGame(preferredMode, selectedRange, null, [entry], "bible");
      } else startGame(preferredMode, selectedRange, versePlay.dataset.ref);
    }
    const mistakePlay = event.target.closest(".mistake-play");
    if (mistakePlay) startMistakeReview(mistakePlay.dataset.mistakeRef);
    const tile = event.target.closest(".word-tile");
    if (tile && game?.mode === "order" && !game.checked) {
      const answer = $(".order-answer");
      const bank = $(".order-bank");
      if (tile.parentElement === bank) {
        game.selectedTiles.push({ id: tile.dataset.tileId, chunk: tile.dataset.chunk });
        tile.classList.add("chosen");
        answer.append(tile);
      } else {
        game.selectedTiles = game.selectedTiles.filter((item) => item.id !== tile.dataset.tileId);
        tile.classList.remove("chosen");
        bank.append(tile);
      }
    }
  });

  $("#quickImportBtn").addEventListener("click", () => { renderImportUI(); openModal("#importModal"); });
  $("#libraryImportBtn").addEventListener("click", () => { renderImportUI(); openModal("#importModal"); });
  $("#openBibleFromHeroBtn").addEventListener("click", () => switchView("bible"));
  $("#openBibleFromImportBtn").addEventListener("click", () => { closeModal($("#importModal")); switchView("bible"); });
  $("#chooseVerseBtn").addEventListener("click", () => ensureVerses(() => openPracticeRange(preferredMode)));
  $("#startTodayBtn").addEventListener("click", () => startPlan("core"));
  $("#continueBtn").addEventListener("click", () => { renderRecordingChecklist(); openModal("#recordingModal"); });
  $("#saveVersesBtn").addEventListener("click", saveImportedVerses);
  $("#verseInput").addEventListener("input", (event) => {
    const parsed = importScope === "ephesians" ? parseVerses(event.target.value) : parseCoreVerses(event.target.value);
    const count = Object.keys(parsed).length;
    const total = importScope === "ephesians" ? 155 : 12;
    $("#parseStatus").textContent = count ? `${count} / ${total}절을 찾았어요` : "장:절 형식으로 입력해 주세요";
  });
  $("#verseTextFile").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      $("#verseInput").value = String(reader.result || "");
      $("#verseInput").dispatchEvent(new Event("input"));
    });
    reader.readAsText(file);
  });
  $("#startRangeBtn").addEventListener("click", startSelectedPracticeRange);
  $("#customStartChapter").addEventListener("change", () => updateCustomRange("start"));
  $("#customStartVerse").addEventListener("change", () => updateCustomRange("start"));
  $("#customEndChapter").addEventListener("change", () => updateCustomRange("end"));
  $("#customEndVerse").addEventListener("change", () => updateCustomRange("end"));
  $("#reviewAllMistakesBtn").addEventListener("click", () => startMistakeReview());
  $("#reloadBibleBtn").addEventListener("click", () => loadBibleData(true));
  $("#bibleBookSelect").addEventListener("change", (event) => {
    bibleSelection = { book: event.target.value, chapter: 1, start: 1, end: 10 };
    renderBibleView();
  });
  $("#bibleChapterSelect").addEventListener("change", (event) => {
    bibleSelection = { ...bibleSelection, chapter: Number(event.target.value), start: 1, end: 10 };
    renderBibleView();
  });
  $("#bibleStartSelect").addEventListener("change", (event) => {
    bibleSelection.start = Number(event.target.value);
    if (bibleSelection.end < bibleSelection.start) bibleSelection.end = bibleSelection.start;
    renderBibleView();
  });
  $("#bibleEndSelect").addEventListener("change", (event) => {
    bibleSelection.end = Number(event.target.value);
    if (bibleSelection.start > bibleSelection.end) bibleSelection.start = bibleSelection.end;
    renderBibleView();
  });
  $("#bibleModeSelect").addEventListener("change", (event) => { preferredMode = event.target.value; renderBibleView(); });
  $("#practiceWholeChapterBtn").addEventListener("click", () => startBibleSelection(true));
  $("#practiceBibleRangeBtn").addEventListener("click", () => startBibleSelection(false));
  $("#openSettingsBtn").addEventListener("click", () => { $("#dailyGoalSelect").value = state.settings.dailyGoal; openModal("#settingsModal"); });
  $("#dailyGoalSelect").addEventListener("change", (event) => { state.settings.dailyGoal = Number(event.target.value); saveState(); renderAll(); showToast("자유 연습 분량을 바꿨어요.", "good"); });
  $("#openWeeklySettingsBtn").addEventListener("click", () => { closeModal($("#settingsModal")); renderWeeklyForm(); openModal("#weeklyModal"); });
  $("#weeklyChapter").addEventListener("change", () => updateWeeklyControls(true));
  $("#weeklyStart").addEventListener("change", () => updateWeeklyControls());
  $("#weeklyEnd").addEventListener("change", () => updateWeeklyControls());
  $("#weeklyQuickInput").addEventListener("input", (event) => {
    const result = previewWeeklyInput(event.target.value);
    $("#weeklyQuickStatus").textContent = result.refs.length ? `${result.refs.length}절을 새 진도로 인식했어요` : "예: 2:10–18";
  });
  $("#applyWeeklyInputBtn").addEventListener("click", applyWeeklyInput);
  $("#saveWeeklyBtn").addEventListener("click", saveWeeklyPlan);
  $("#addCumulativeBtn").addEventListener("click", addCumulativeRange);
  $("#reminderToggle").addEventListener("click", toggleReminders);
  $("#weeklyReminderTime").addEventListener("change", (event) => saveReminderTime("weekly", event.target.value));
  $("#cumulativeReminderTime").addEventListener("change", (event) => saveReminderTime("cumulative", event.target.value));
  $("#recordingReminderTime").addEventListener("change", (event) => saveReminderTime("recording", event.target.value));
  $("#reminderActionBtn").addEventListener("click", () => {
    if (currentReminderAction === "recording") { renderRecordingChecklist(); openModal("#recordingModal"); }
    else if (currentReminderAction) startPlan(currentReminderAction);
  });
  $("#recordButton").addEventListener("click", toggleRecording);
  $("#shareRecordingBtn").addEventListener("click", shareRecording);
  $("#uploadTeamRecordingBtn").addEventListener("click", () => {
    if (!recordingBlob || !teamSession) return;
    setTeamPendingAudio(recordingBlob);
    closeModal($("#recordingModal"));
    switchView("team");
    setTimeout(() => $("#teamCertificationForm").scrollIntoView({ behavior: "smooth", block: "center" }), 250);
    showToast("방금 녹음을 준비했어요. 진도를 고르고 올려 주세요.", "good");
  });
  $("#createTeamForm").addEventListener("submit", createTeam);
  $("#joinTeamForm").addEventListener("submit", joinTeam);
  $("#teamProgressForm").addEventListener("submit", addTeamProgress);
  $("#teamCertificationForm").addEventListener("submit", submitTeamCertification);
  $("#teamProgressFilter").addEventListener("change", (event) => { teamSelectedProgress = event.target.value; renderTeam(); });
  $("#joinTeamCode").addEventListener("input", (event) => { event.target.value = event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 8); });
  $("#teamAudioFile").addEventListener("change", (event) => setTeamPendingAudio(event.target.files[0] || null));
  $("#useLatestRecordingBtn").addEventListener("click", () => {
    if (!recordingBlob) return;
    setTeamPendingAudio(recordingBlob);
    showToast("방금 녹음한 파일을 선택했어요.", "good");
  });
  $("#copyTeamCodeBtn").addEventListener("click", copyTeamCode);
  $("#shareTeamBtn").addEventListener("click", shareTeamInvite);
  $("#refreshTeamBtn").addEventListener("click", () => loadTeamDashboard(true));
  $("#leaveTeamBtn").addEventListener("click", () => {
    if (!confirm("이 기기에서 그룹 참여 정보를 지울까요? 그룹에 올린 인증은 그대로 남습니다.")) return;
    saveTeamSession(null);
    teamData = null;
    teamSelectedProgress = "";
    setTeamPendingAudio(null);
    const url = new URL(location.href);
    url.searchParams.delete("team");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    renderTeam();
    showToast("이 기기의 그룹 참여 정보를 지웠어요.");
  });
  $("#copyrightBtn").addEventListener("click", () => openModal("#copyrightModal"));
  $("#exportBtn").addEventListener("click", exportBackup);
  $("#backupInput").addEventListener("change", (event) => event.target.files[0] && importBackup(event.target.files[0]));
  $("#resetProgressBtn").addEventListener("click", () => {
    if (!confirm("저장한 본문은 남기고 학습 기록만 초기화할까요?")) return;
    state.progress = {}; state.history = []; state.mistakes = {}; state.certifications = {}; state.reminders.lastSent = {}; state.lastSession = null; saveState(); renderAll(); closeModal($("#settingsModal")); showToast("학습 기록과 오답노트를 새로 시작합니다.");
  });
  $("#mobileMenuBtn").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
  $("#checkAnswerBtn").addEventListener("click", checkChallenge);
  $("#hintBtn").addEventListener("click", showHint);
  $("#voiceStartBtn").addEventListener("click", toggleVoiceRecognition);
  $("#voiceGradeBtn").addEventListener("click", gradeVoiceAnswer);
  $("#exitGameBtn").addEventListener("click", () => {
    if (game && (game.index > 0 || game.checked) && !confirm("지금 연습을 나갈까요? 기록된 결과는 그대로 남습니다.")) return;
    stopVoiceRecognition("");
    clearTimeout(continuousAdvanceTimerId);
    if (game?.sessionType === "core-continuous" && mediaRecorder?.state === "recording") mediaRecorder.stop();
    $("#gameOverlay").classList.remove("open"); $("#gameOverlay").setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; game = null; renderAll();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const open = $(".modal-backdrop.open");
      if (open) closeModal(open);
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && $("#gameOverlay").classList.contains("open")) checkChallenge();
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkReminders(); });

  renderAll();
  loadBibleData();
  checkReminders();
  reminderIntervalId = setInterval(checkReminders, 30000);
  if (teamInviteCode()) switchView("team");
})();
