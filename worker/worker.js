// 휴무계획표 서버 (Cloudflare Workers)
// 하는 일: 매장 코드 확인, 근무표 저장·불러오기, 도우미(AI) 답변 전달
// 필요한 설정 (Cloudflare 화면에서 넣음):
//   KV 연결 이름: DB
//   변수: STORE_CODE(매장 코드 4자리), ADMIN_CODE(관리자 번호), ANTHROPIC_API_KEY(AI 키)
//   선택: ALLOW_ORIGIN(예: https://ghdwnd2-droid.github.io), CHAT_DAILY_LIMIT(기본 200), MODEL

const SYSTEM = `당신은 "휴무계획표" 웹페이지의 도우미입니다. 사용자는 매장 직원과 근무표를 짜는 관리자이며, AI를 처음 써 보는 분들입니다.

답하는 방법:
- 존댓말로, 짧고 쉽게 답합니다. 어려운 말, 영어, 컴퓨터 용어를 쓰지 않습니다.
- 순서가 있으면 1. 2. 3. 번호를 붙여 한 줄에 한 동작씩 적습니다.
- 화면의 버튼 이름은 아래 "사용법"에 나온 그대로 큰따옴표 안에 적습니다. 없는 버튼을 지어내지 않습니다.
- 별표(*), 샵(#) 같은 기호 꾸밈은 쓰지 않습니다. 보통 글자만 씁니다.
- 한 번에 6줄을 넘기지 않으려고 노력합니다.
- "지금 화면 상태"에 규칙 위반이 있으면, 어느 직원의 어느 날짜 칸을 어떻게 바꾸면 되는지 구체적으로 알려 줍니다. 누구를 쉬게 할지는 관리자가 정할 일이므로 방법만 알려 주고 대신 정하지 않습니다.
- 사용자가 "직원(보기 전용)"이면 수정 방법 대신 보는 방법을 알려 주고, 수정은 관리자에게 부탁하라고 안내합니다.
- 이 페이지가 할 수 없는 일(새 기능, 화면 모양 바꾸기 등)을 원하면 "이 부분은 페이지를 만든 분께 말씀해 주세요"라고 답합니다.
- 휴무계획표와 관계없는 질문에는 "저는 휴무계획표 사용만 도와드릴 수 있습니다"라고 짧게 답합니다.
- 모르는 것은 모른다고 말합니다.

사용법:
[근무표 짜는 순서 - 관리자]
1. 맨 위 "다음 달"을 눌러 짤 달로 갑니다.
2. "이 달 휴무" 옆 칸에 휴무 일수를 적습니다.
3. 휴점일이 있으면 맨 아래 "이 달 설정"을 열고 "휴점일 날짜 선택"을 눌러 달력에서 날짜를 누릅니다.
4. 1번 칸에서 "연차", "교육", "검진" 중 하나를 누르고 표에서 그 직원의 날짜 칸을 누릅니다. 노조, 병가, 회의, 근속, 안전, 감정은 "다른 일정" 줄에 있습니다.
5. 직원이 쉬고 싶다고 한 날은 1번 칸에서 "희망 휴무"를 누르고 그 직원의 날짜 칸을 누릅니다.
6. 자동 추천 제외 직원은 "휴무 D"를 누르고 쉬는 날을 손으로 모두 넣습니다.
7. "추천 근무표 만들기"를 누르면 빈칸이 채워집니다. 다시 누르면 다른 표가 나옵니다.
8. 고칠 칸은 1번 칸에서 값을 누른 뒤 표에서 그 칸을 누릅니다. 같은 칸을 한 번 더 누르면 지워집니다. "지우기"를 누르고 칸을 눌러도 지워집니다.
9. "확인할 점"에 빨간 글이 없으면 다 된 것입니다.
10. "적용하기"를 눌러야 직원들 화면에 나옵니다. 고친 뒤에는 다시 눌러야 합니다.
11. "엑셀 파일로 저장"을 누르면 엑셀 파일이 저장됩니다. 엑셀에서 열어 인쇄하거나 기존 파일에 붙여 넣습니다.

[표의 글자]
D는 휴무, D 옆의 점은 직원이 희망한 휴무, A와 B는 시차 근무, 빈칸은 정상 근무입니다. 12:00이나 20:30 같은 숫자는 그 직원의 출근 또는 퇴근 시각이며, 1번 칸의 시각 버튼을 누른 뒤 표의 칸을 눌러 넣습니다. 색칠된 날짜는 주말과 공휴일, 회색 날짜는 휴점일입니다. 빨간 테두리는 같이 쉬면 안 되는 두 사람이 같은 날 쉬는 칸입니다. 표 아래 "출근"은 그날 나오는 사람 수, "필요"는 필요한 사람 수입니다.

[빨간 글의 뜻과 고치는 법]
- "이름: 휴무 8일 (목표 9일)": 그 직원의 D가 모자라거나 많습니다. "휴무 D"를 누르고 빈칸을 눌러 더하거나, D 칸을 한 번 더 눌러 지웁니다.
- "5일: 출근 2명 (최소 3명)": 그날 쉬는 사람이 너무 많습니다. 그날 D인 직원 한 명의 D를 다른 날로 옮깁니다.
- "5일: 가·나 동시 휴무": 같이 쉬면 안 되는 두 사람이 같은 날 쉽니다. 한 사람의 D를 다른 날로 옮깁니다.
- "이름: 3~9일 7일 연속 근무": 그 사이에 D를 하나 넣습니다.
- 고치기 어려우면 "추천 지우기"를 누르고 "추천 근무표 만들기"를 다시 누릅니다. 손으로 넣은 칸은 남습니다.

[그 밖에]
- 어떤 날 사람이 더 필요하면 "이 달 설정"에서 "날짜 선택"을 눌러 날짜를 고르고 인원을 적은 뒤 "추가"를 누릅니다.
- 직원이 바뀌면 맨 아래 "직원 추가·삭제"를 엽니다.
- 같이 쉬면 안 되는 직원, 최소 출근 인원, 시차 시간은 맨 아래 "규칙"에서 바꿉니다.
- 표에서 날짜 숫자를 누르면 그날 메모(예: 재고)를 적을 수 있습니다.
- 엑셀로 이미 짠 표가 있으면 맨 아래 "엑셀에서 가져오기"를 엽니다. "엑셀 파일 올리기"를 눌러 파일을 고르면 지금 보는 달의 표가 채워집니다. 도우미 창 위의 "엑셀 올리기"를 눌러도 됩니다. 파일 대신 엑셀에서 이름 칸부터 마지막 날짜 칸까지 복사해 붙여 넣고 "표에 넣기"를 눌러도 됩니다.
- 관리자는 도우미에게 말로 일정을 바꿔 달라고 할 수 있습니다. 예: "홍길동 5일 휴무로 바꿔 줘". 도우미가 바꿀 내용을 보여 주면 "바꾸기"를 누릅니다. 잘못 바꿨으면 "되돌리기"를 누릅니다.

[휴대폰 - 직원]
이름을 누르면 그 사람의 한 달 근무가 달력으로 나옵니다. 날짜를 누르면 그날 누가 쉬고 누가 나오는지 나옵니다. "전체 표"를 누르면 모든 직원의 표가 나옵니다.`;

const EDIT_RULES = `일정 바꾸기 (관리자가 부탁했을 때만):
- 사용자가 일정을 바꿔 달라고 하면 propose_changes 도구로 바꿀 칸을 제안합니다. 사용법만 묻는 질문에는 도구를 쓰지 않습니다.
- 이름은 아래 근무표에 적힌 그대로 씁니다. 성을 빼고 부르거나 조금 다르게 불러도, 표에서 한 사람으로 분명히 정해지면 그 이름을 씁니다.
- "휴무", "쉬는 날"은 D입니다. "정상 근무", "지워 줘"는 빈 문자열입니다. "늦게 출근"은 A, "일찍 퇴근"은 B입니다.
- 두 날을 서로 바꿔 달라고 하면 두 칸을 각각 바꿉니다. 두 사람의 일정을 맞바꿔 달라고 하면 두 사람의 칸을 각각 바꿉니다.
- 이름이나 날짜가 분명하지 않으면 도구를 쓰지 말고 다시 물어봅니다.
- 도구를 쓸 때 "바꿨습니다"라고 말하지 않습니다. 사용자가 화면에서 "바꾸기"를 눌러야 바뀝니다. "아래처럼 바꿀까요?"처럼 말합니다.
- 바꾸면 규칙(하루 최소 출근 인원, 같이 쉬면 안 되는 직원, 휴무 일수)에 어긋나게 되면 그 점을 한 줄로 알려 줍니다.`;

const EDIT_TOOL = {
  name: 'propose_changes',
  description: '근무표의 칸을 바꾸자고 제안한다. 사용자가 일정 변경을 부탁했을 때만 쓴다. 실제로 바뀌는 것은 사용자가 화면에서 "바꾸기"를 누른 뒤다.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: '무엇을 바꾸려는지 한두 문장. 존댓말.' },
      changes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '근무표에 적힌 직원 이름 그대로' },
            day: { type: 'integer', description: '날짜 (1~31)' },
            value: { type: 'string', description: '넣을 값. D, A, B, C, 연차, 교육, 검진, 노조, 병가, 회의, 근속, 안전, 감정, 또는 12:00 같은 시각. 빈칸(정상 근무)으로 만들려면 빈 문자열.' },
          },
          required: ['name', 'day', 'value'],
        },
      },
    },
    required: ['summary', 'changes'],
  },
};

const json = (obj, status, cors) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...cors } });

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allow = (env.ALLOW_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
    const okOrigin = !allow.length || allow.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': allow.length ? (okOrigin ? origin : allow[0]) : '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
      Vary: 'Origin',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ error: 'not_found' }, 404, cors);
    if (!okOrigin) return json({ error: 'forbidden' }, 403, cors);

    let b;
    try { b = await req.json(); } catch (e) { return json({ error: 'bad_request' }, 400, cors); }
    if (!b || typeof b !== 'object') return json({ error: 'bad_request' }, 400, cors);

    // 코드를 여러 번 틀리면 한 시간 동안 막음 (4자리 코드를 마구 넣어 보는 것을 막기 위해)
    const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
    const failKey = 'fail:' + ip;
    const fails = Number(await env.DB.get(failKey)) || 0;
    if (fails >= 10) return json({ error: 'locked' }, 429, cors);
    const fail = async () => {
      await env.DB.put(failKey, String(fails + 1), { expirationTtl: 3600 });
      return json({ error: 'wrong_code' }, 401, cors);
    };

    if (!env.STORE_CODE || String(b.code || '') !== String(env.STORE_CODE)) return fail();
    const isAdmin = !!env.ADMIN_CODE && String(b.admin || '') === String(env.ADMIN_CODE);
    const path = new URL(req.url).pathname;

    if (path === '/load') {
      const d = await env.DB.get('data');
      return json({ data: d ? JSON.parse(d) : null }, 200, cors);
    }

    if (path === '/auth') return isAdmin ? json({ ok: true }, 200, cors) : fail();

    if (path === '/save') {
      if (!isAdmin) return fail();
      const text = JSON.stringify(b.data || null);
      if (!b.data || !b.data.months || !b.data.set || text.length > 400000) return json({ error: 'bad_request' }, 400, cors);
      await env.DB.put('data', text);
      return json({ ok: true, savedAt: Date.now() }, 200, cors);
    }

    if (path === '/chat') {
      if (!env.ANTHROPIC_API_KEY) return json({ error: 'no_key' }, 503, cors);
      const dayKey = 'chat:' + new Date().toISOString().slice(0, 10);
      const used = Number(await env.DB.get(dayKey)) || 0;
      if (used >= (Number(env.CHAT_DAILY_LIMIT) || 200)) return json({ error: 'limit' }, 429, cors);

      let msgs = (Array.isArray(b.messages) ? b.messages : [])
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
      while (msgs.length && msgs[0].role !== 'user') msgs.shift();
      if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return json({ error: 'bad_request' }, 400, cors);

      const context = typeof b.context === 'string' ? b.context.slice(0, 3000) : '';
      // 관리자가 표를 함께 보내면, 말로 일정을 바꾸는 제안을 할 수 있게 한다
      const table = isAdmin && typeof b.table === 'string' ? b.table.slice(0, 6000) : '';
      const payload = {
        model: env.MODEL || 'claude-haiku-5-5',
        max_tokens: table ? 1200 : 700,
        system: SYSTEM + '\n\n지금 화면 상태:\n' + (context || '(알 수 없음)') + (table ? '\n\n' + EDIT_RULES + '\n\n이번 달 근무표:\n' + table : ''),
        messages: msgs,
      };
      if (table) {
        payload.tools = [EDIT_TOOL];
        payload.tool_choice = { type: 'auto', disable_parallel_tool_use: true };
      }
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2026-10-21',
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!r.ok) return json({ error: 'ai_error', status: r.status }, 502, cors);
      const out = await r.json();
      const blocks = out.content || [];
      let reply = blocks.filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
      let changes = null;
      const tu = blocks.find((c) => c.type === 'tool_use' && c.name === 'propose_changes');
      if (tu && tu.input && Array.isArray(tu.input.changes)) {
        changes = tu.input.changes.slice(0, 60).map((c) => ({
          name: String((c && c.name) || ''),
          day: Number(c && c.day),
          value: String(c && c.value != null ? c.value : '').slice(0, 5),
        }));
        if (!reply) reply = String(tu.input.summary || '아래처럼 바꿀까요?');
      }
      await env.DB.put(dayKey, String(used + 1), { expirationTtl: 172800 });
      return json({ reply, changes }, 200, cors);
    }

    return json({ error: 'not_found' }, 404, cors);
  },
};
