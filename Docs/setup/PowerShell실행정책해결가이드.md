# PowerShell 실행 정책 오류 해결 가이드

## 문제 상황
PowerShell에서 npm 명령어 실행 시 다음과 같은 오류 발생:
```
npm : 이 시스템에서 스크립트를 실행할 수 없으므로 C:\nvm4w\nodejs\npm.ps1 파일을 로드할 수 없습니다.
```

## 해결 방법

### 방법 1: PowerShell 실행 정책 변경 (권장)

1. **PowerShell을 관리자 권한으로 실행**
   - 시작 메뉴에서 "PowerShell" 검색
   - "Windows PowerShell" 우클릭 → "관리자 권한으로 실행"

2. **실행 정책 확인**
   ```powershell
   Get-ExecutionPolicy
   ```

3. **실행 정책 변경**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

4. **변경 확인 (Y 입력)**
   ```
   실행 정책 변경
   실행 정책은 신뢰할 수 없는 원격 스크립트로부터 시스템을 보호합니다. 실행 정책을 변경하면 about_Execution_Policies 도움말 항목(http://go.microsoft.com/fwlink/?LinkID=135170)에 설명된 보안 위험이 발생할 수 있습니다. 실행 정책을 변경하시겠습니까?
   [Y] 예(Y)  [A] 모두 예(A)  [N] 아니요(N)  [L] 모두 아니요(L)  [S] 일시 중단(S)  [?] 도움말 (기본값은 "N"): Y
   ```

5. **npm 버전 확인**
   ```powershell
   npm -v
   node -v
   ```

### 방법 2: 명령 프롬프트 사용 (임시 해결책)

1. **명령 프롬프트 실행**
   - `Win + R` → `cmd` 입력 → Enter

2. **npm 버전 확인**
   ```cmd
   npm -v
   node -v
   ```

### 방법 3: 일시적 실행 정책 변경

PowerShell에서 다음 명령어로 현재 세션에만 적용:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
npm -v
```

## 실행 정책 설명

- **Restricted**: 스크립트 실행 불가 (기본값)
- **RemoteSigned**: 로컬 스크립트는 실행 가능, 원격 스크립트는 서명 필요
- **Unrestricted**: 모든 스크립트 실행 가능 (보안상 권장하지 않음)

## 추가 문제 해결

### npm이 인식되지 않는 경우
1. **PATH 환경변수 확인**
   ```powershell
   $env:PATH -split ';' | Where-Object { $_ -like '*node*' }
   ```

2. **Node.js 재설치**
   - nvm을 사용한 경우: `nvm reinstall-packages-from=node`
   - 일반 설치의 경우: Node.js 재설치

### nvm 사용 시 추가 설정
```powershell
# nvm으로 Node.js 설치
nvm install lts
nvm use lts

# 설치된 버전 확인
nvm list
```

## 다음 단계
PowerShell 실행 정책 문제가 해결되면 다음 명령어로 프로젝트를 생성할 수 있습니다:

```powershell
npm create vite@latest whiskey-notes-app -- --template react-ts
cd whiskey-notes-app
npm install
npm run dev
```

## 문제가 지속되는 경우
1. 시스템 재시작
2. Node.js 완전 제거 후 재설치
3. 다른 Node.js 버전 관리 도구 사용 (예: Volta, fnm)

해결이 완료되면 "해결 완료"라고 말씀해주세요!
