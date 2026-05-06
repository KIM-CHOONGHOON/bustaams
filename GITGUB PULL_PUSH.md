# GitHub PULL / PUSH (충돌 최소화)

`project_bustaams/bus-taams` 저장소(`feat/kch-init-setup` 등)에서 **원격과 맞춘 뒤** 로컬 작업을 올릴 때 쓰는 절차입니다.  
(파일명 `GITGUB`는 `GITHUB` 오타이나, 팀/개인 약칭으로 그대로 사용합니다.)

---

## 1. 저장소 위치

| 항목 | 값 |
|------|-----|
| Git 루트 | `.../project_bustaams/bus-taams` (상위 `project_bustaams`만 있으면 **여기는 저장소가 아님** — 반드시 `cd bus-taams`) |
| 백엔드 진입점 | `busTaams_server/server.js` |
| 라우트 | 이 프로젝트는 `server.js`에서 요청을 연결하며, 개별 API는 `busTaams_server/routes/*.js` 등에 둡니다(별도 루트 `router.js`가 없을 수 있음). |

---

## 2. 로컬에서 변경·삭제·추가된 파일 “전체 목록” 만들기

터미널에서 **반드시 `bus-taams`로 이동**한 뒤 아래를 실행합니다. 출력이 **권위 있는** 변경 목록입니다.

```bash
cd /path/to/project_bustaams/bus-taams

# 한 줄 요약
git status -sb

# 자세한 목록(수정/삭제/추가/untracked)
git status

# 파일 경로만 (스크립트/붙여넣기용)
git status --porcelain

# 변경 내용이 있는 경로만
git diff --name-only
git diff --cached --name-only
git ls-files --others --exclude-standard
```

- 목록을 파일로 남기려면:

```bash
git status > /tmp/my-git-status.txt
git status --porcelain > /tmp/my-git-porcelain.txt
```

> **이 문서를 만든 시점의 이 워크스페이스 Git 스냅샷**에서는 삭제 1건만 잡혔습니다.  
> **실제 맥/다른 PC의 로컬**에는 훨씬 더 많은 수정이 있을 수 있으니, **반드시 위 명령으로 본인 환경 목록**을 뽑으세요.

---

## 3. 설계·참고 문서 (요구사항/정본)

아래 **`.md` 파일**을 기준으로 `busTaams_web/`, `busTaams_server/`, REST 파라미터, `server.js` 연동이 정리·변경되었다고 가정합니다.

| 문서 | 역할(요지) |
|------|------------|
| `기사정보등록_기사 화면.md` | 기사 측 정보 등록 화면 / API·DB 정본 |
| `차량정보등록 화면.md` | 차량 모달, 서류/스트리밍/차량 API |
| `CommonView.md` | CommonView 뷰어, 메타/다운로드/스트림 URL |
| `BusTaams 테이블.md` | 테이블·컬럼 ID 정책 |
| `운전기사 MainDashBoard.md` | 기사 대시보드, 진입/컴포넌트 |

삭제한 문서:

| 문서 | 조치 |
|------|------|
| ~~`기사님 프로필.md`~~ | 삭제됨 → `git`에서는 **삭제(D)** 로 잡힐 수 있음. 커밋에 포함하려면 `git add`로 스테이징(삭제 반영) |

---

## 4. 충돌을 줄이는 권장 순서 (PULL → 작업 맞춤 → PUSH)

### 4-1. 풀(pull) 전

1. **작업이 커밋 가능한지** 짧게 정리(대량 수정이면 메시지를 나누기).
2. **`.env`**, DB 비밀, 키는 **원격에 올리지 않기**.  
   - 이미 추적 중이면 `git restore --staged` / `git update-index --assume-unchanged` 등 **팀 규칙**에 맞게 처리.  
3. `git fetch origin`  
4. **로컬에 미커밋이 많다면** (같은 파일이 원격에서도 바뀌었을 수 있음):
   - **임시 밀어두기(권장)**  
     ```bash
     git stash push -u -m "WIP: before pull"
     ```
5. `git pull origin feat/kch-init-setup`  
   (브랜치가 다르면 `main` 등 실제 사용 브랜치로 변경)
6. stash를 썼다면:  
   ```bash
   git stash pop
   ```  
   - 같은 파일이 양쪽에서 바뀌면 **충돌** → 충돌마커(`<<<<<<<`)를 직접 합친 뒤 `git add` → 이어서 커밋.

### 4-2. 푸시(push) 전

1. `git status`로 **올릴 것만** 스테이징: `git add <파일>` 또는 `git add -p`  
2. `git diff --cached`로 스테이징 내용 확인  
3. `git commit -m "의미 있는 한 줄 + 필요 시 본문"`  
4. 다시 `git pull origin feat/kch-init-setup`로 **최신 한 번 맞추기**(팀이 rebase 쓰면 `git pull --rebase` 정책에 따름)  
5. `git push origin feat/kch-init-setup`  

> **뒤쳐짐(Your branch is behind)** 메시지가 있으면 **push 전에 pull**이 안전합니다.  
> **fast-forward**가 되면 병합 충돌이 안 나는 경우가 많고, **같은 줄을 둘 다 고친 경우**엔 pull/merge 시 충돌이 납니다.

---

## 5. 충돌이 났을 때 (요지)

- Git이 `both modified` 등으로 표시한 파일을 열고 `<<<<<<<` / `=======` / `>>>>>>>` 를 **한 가지 합의된 내용**으로 정리.  
- `git add`로 해결한 파일 표시.  
- merge 중이면 `git commit`, rebase 중이면 `git rebase --continue`.  
- 중단이 필요하면 `git merge --abort` 또는 `git rebase --abort` (팀 룰 확인).

---

## 6. 체크리스트 (푸시 직전)

- [ ] `cd .../bus-taams` 인지 확인  
- [ ] `git status` — 의도한 파일만 변경/스테이징  
- [ ] `기사님 프로필.md` 삭제를 **의도**했다면 삭제가 커밋에 포함됐는지  
- [ ] `.env` 및 비밀 정보 미포함  
- [ ] `git pull` 후 푸시, 또는 `push` 직전 한 번 더 `pull`  
- [ ] `git push origin <브랜치명>`  

---

## 7. 자주 쓰는 한 줄 (브랜치: `feat/kch-init-setup` 가정)

```bash
cd /path/to/project_bustaams/bus-taams
git fetch origin
git stash push -u -m "WIP"    # 로컬 변경이 많을 때
git pull origin feat/kch-init-setup
git stash pop                 # 썼다면
# 충돌 해결 → add → commit
git push origin feat/kch-init-setup
```

---

*로컬 변경 목록은 항상 `git status` 기준. 문서/코드는 `기사정보등록_기사 화면.md`, `차량정보등록 화면.md`, `CommonView.md`, `BusTaams 테이블.md`, `운전기사 MainDashBoard.md` 및 삭제된 `기사님 프로필.md` 반영.*
