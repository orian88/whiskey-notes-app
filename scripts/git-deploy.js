import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Git 상태 확인
function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    });
    
    if (status.trim() === '') {
      console.log('📝 변경사항이 없습니다.');
      return false;
    }
    
    console.log('📋 변경된 파일들:');
    console.log(status);
    return true;
  } catch (error) {
    console.error('❌ Git 상태 확인 실패:', error.message);
    return false;
  }
}

// Git 커밋 메시지 생성
function generateCommitMessage() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  
  // Service Worker 버전 확인
  const swPath = path.join(__dirname, '..', 'public', 'sw.js');
  let swVersion = 'v7';
  
  try {
    const swContent = fs.readFileSync(swPath, 'utf8');
    const versionMatch = swContent.match(/whiskey-notes-v(\d+)/);
    if (versionMatch) {
      swVersion = `v${versionMatch[1]}`;
    }
  } catch (error) {
    console.log('⚠️ Service Worker 버전 확인 실패, 기본값 사용');
  }
  
  return `feat: 모바일 최적화 및 오프라인 기능 업데이트 (${swVersion})

📱 모바일 최적화
- 반응형 카드 레이아웃 구현
- 모바일 화면에 최적화된 카드 크기 조정
- 터치 친화적인 UI 개선

🔄 Pull-to-refresh 기능
- 상단 드래그로 새로고침 기능 구현
- 시각적 피드백 및 애니메이션 추가
- 카드 목록과 달력 페이지에 적용

📴 오프라인 CRUD 기능
- IndexedDB 기반 오프라인 데이터 저장
- 자동 동기화 시스템 구현
- 오프라인 상태 표시 UI 추가

✨ 사용성 개선
- 상세 보기에서 수정 버튼 활성화
- 레이아웃 겹침 문제 해결
- 카드 목록 상단 여백 추가

🔧 기술적 개선
- Service Worker ${swVersion} 업데이트
- 오프라인 데이터 관리자 구현
- Pull-to-refresh 커스텀 훅 구현

배포 시간: ${dateStr} ${timeStr}`;
}

// Git 작업 실행
function executeGitOperations() {
  const projectRoot = path.join(__dirname, '..');
  
  try {
    console.log('🔄 Git 작업 시작...');
    
    // 1. 모든 변경사항 추가
    console.log('📁 변경사항 추가 중...');
    execSync('git add .', { 
      cwd: projectRoot,
      stdio: 'inherit'
    });
    console.log('✅ 변경사항 추가 완료');
    
    // 2. 커밋 메시지 생성 및 커밋
    console.log('💬 커밋 메시지 생성 중...');
    const commitMessage = generateCommitMessage();
    
    console.log('📝 커밋 실행 중...');
    execSync(`git commit -m "${commitMessage}"`, { 
      cwd: projectRoot,
      stdio: 'inherit'
    });
    console.log('✅ 커밋 완료');
    
    // 3. 원격 저장소에 푸시
    console.log('🚀 원격 저장소에 푸시 중...');
    execSync('git push origin main', { 
      cwd: projectRoot,
      stdio: 'inherit'
    });
    console.log('✅ 푸시 완료');
    
    // 4. 배포 상태 확인
    console.log('🌐 배포 상태 확인 중...');
    try {
      const remoteUrl = execSync('git remote get-url origin', { 
        encoding: 'utf8',
        cwd: projectRoot
      }).trim();
      
      console.log('📡 원격 저장소:', remoteUrl);
      
      if (remoteUrl.includes('github.com')) {
        const repoName = remoteUrl.split('/').slice(-2).join('/').replace('.git', '');
        console.log('🔗 GitHub Actions 배포 링크:');
        console.log(`   https://github.com/${repoName}/actions`);
      }
      
    } catch (error) {
      console.log('⚠️ 원격 저장소 정보 확인 실패');
    }
    
    console.log('🎉 Git 배포 완료!');
    console.log('⏳ Vercel에서 자동 빌드 및 배포가 시작됩니다...');
    console.log('📱 잠시 후 웹사이트에서 새 기능을 확인하세요!');
    
  } catch (error) {
    console.error('❌ Git 작업 실패:', error.message);
    
    if (error.message.includes('nothing to commit')) {
      console.log('💡 변경사항이 없어서 커밋할 내용이 없습니다.');
    } else if (error.message.includes('no upstream branch')) {
      console.log('💡 원격 브랜치가 설정되지 않았습니다.');
      console.log('   다음 명령어로 설정하세요: git push --set-upstream origin main');
    }
    
    process.exit(1);
  }
}

// 브랜치 정보 확인
function checkBranchInfo() {
  try {
    const currentBranch = execSync('git branch --show-current', { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    }).trim();
    
    const remoteBranches = execSync('git branch -r', { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('🌿 현재 브랜치:', currentBranch);
    console.log('📡 원격 브랜치들:');
    console.log(remoteBranches);
    
    return currentBranch;
  } catch (error) {
    console.error('❌ 브랜치 정보 확인 실패:', error.message);
    return 'unknown';
  }
}

// 메인 실행 함수
function main() {
  console.log('🚀 Git 자동 배포 스크립트 시작');
  console.log('=' .repeat(50));
  
  try {
    // 1. 브랜치 정보 확인
    const currentBranch = checkBranchInfo();
    console.log('');
    
    // 2. Git 상태 확인
    const hasChanges = checkGitStatus();
    console.log('');
    
    if (!hasChanges) {
      console.log('💡 변경사항이 없습니다. 배포를 건너뜁니다.');
      return;
    }
    
    // 3. 사용자 확인 (선택사항)
    console.log('⚠️ 위의 변경사항들을 커밋하고 배포하시겠습니까?');
    console.log('   자동으로 진행됩니다...');
    console.log('');
    
    // 4. Git 작업 실행
    executeGitOperations();
    
  } catch (error) {
    console.error('❌ 스크립트 실행 실패:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
main();
