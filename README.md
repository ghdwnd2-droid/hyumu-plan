# 휴무계획표

매장 휴무계획(근무표)을 짜고, 직원들이 휴대폰으로 보는 페이지입니다.

## 구성

| 파일 | 하는 일 |
|---|---|
| `index.html` | 페이지 전체 (GitHub Pages로 배포) |
| `worker/worker.js` | Cloudflare 서버. 매장 코드 확인, 근무표 저장·불러오기, 도우미(AI) 답변 |
| `docs/사용법.txt` | 대리님용 사용법 |

## 동작 방식

- 직원: 링크를 열고 매장 코드 4자리를 한 번 입력하면 근무표가 보입니다. 보기 전용입니다.
- 관리자: 맨 아래 "관리자"에 관리자 번호를 넣으면 수정할 수 있고, "적용하기"를 눌러야 직원 화면에 반영됩니다.
- 직원 이름과 근무표는 코드(이 저장소)에 없고 Cloudflare 저장소(KV)에만 있습니다.
- 코드를 10번 틀리면 한 시간 동안 막힙니다.
- 도우미는 하루 200번까지 답합니다(`CHAT_DAILY_LIMIT`으로 변경).

## Cloudflare 설정값

| 종류 | 이름 | 값 |
|---|---|---|
| KV 연결 | `DB` | 새로 만든 KV 저장소 |
| 비밀 변수 | `STORE_CODE` | 매장 코드 숫자 4자리 |
| 비밀 변수 | `ADMIN_CODE` | 관리자 번호 |
| 비밀 변수 | `ANTHROPIC_API_KEY` | Claude API 키 |
| 변수(선택) | `ALLOW_ORIGIN` | `https://ghdwnd2-droid.github.io` |
| 변수(선택) | `CHAT_DAILY_LIMIT` | 기본 200 |
| 변수(선택) | `MODEL` | 기본 `claude-haiku-5-5` |

서버 주소가 나오면 `index.html`의 `const API_URL='';` 따옴표 안에 넣습니다.
비워 두면 서버 없이, 기기에만 저장하는 방식으로 동작합니다.
