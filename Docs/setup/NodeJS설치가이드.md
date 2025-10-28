# Node.js 설치 가이드

## Node.js 설치 방법

### 1. 공식 웹사이트에서 다운로드
1. [Node.js 공식 사이트](https://nodejs.org/) 방문
2. **LTS 버전** (Long Term Support) 다운로드 권장
3. Windows용 `.msi` 파일 다운로드
4. 다운로드한 파일 실행하여 설치

## npm 권한 문제 오류 발생시 
1. **PowerShell을 관리자 권한으로 실행**
2. 다음 명령어 실행:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. `Y` 입력하여 확인
4. 다시 `npm -v` 실행


### 2. 설치 확인
설치 완료 후 명령 프롬프트에서 다음 명령어로 확인:
```bash
node --version
npm --version
```

### 3. 대안: Chocolatey 사용 (Windows)
PowerShell을 관리자 권한으로 실행 후:
```powershell
# Chocolatey 설치
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Node.js 설치
choco install nodejs
```

### 4. 대안: nvm-windows 사용 (권장)
1. [nvm-windows GitHub](https://github.com/coreybutler/nvm-windows)에서 다운로드
2. `nvm-setup.exe` 실행하여 설치
3. 명령 프롬프트에서:
```bash
# Node.js LTS 버전 설치
nvm install lts
nvm use lts
```

## 설치 후 다음 단계
Node.js 설치가 완료되면 다음 명령어로 프로젝트를 생성할 수 있습니다:

```bash
npm create vite@latest whiskey-notes-app -- --template react-ts
cd whiskey-notes-app
npm install
npm run dev
```

## 문제 해결
- **권한 오류**: PowerShell을 관리자 권한으로 실행
- **PATH 문제**: 시스템 재시작 후 다시 시도
- **프록시 환경**: 회사 네트워크의 경우 프록시 설정 확인

Node.js 설치가 완료되면 "설치 완료"라고 말씀해주세요!
