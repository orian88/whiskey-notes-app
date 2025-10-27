import React, { useRef, useCallback, useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = '내용을 입력하세요...',
  style,
  disabled = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const composingRef = useRef<boolean>(false);
  const lastAppliedHtmlRef = useRef<string>('');

  // 외부 content 변경 시에만 DOM 동기화 (커서 밀림 방지)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (composingRef.current) return;
    // 외부 content가 바뀌었을 때만 반영
    if (lastAppliedHtmlRef.current !== content) {
      el.innerHTML = content || '';
      lastAppliedHtmlRef.current = content || '';
    }
  }, [content]);

  // 메모리 누수 방지를 위한 cleanup
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    };
  }, []);

  const execCommand = useCallback((command: string, value?: string) => {
    if (disabled) return; // disabled 상태에서는 명령 실행 안함
    if (editorRef.current) {
      document.execCommand(command, false, value);
      if (!composingRef.current) {
        const html = editorRef.current.innerHTML;
        lastAppliedHtmlRef.current = html;
        onChange(html);
      }
    }
  }, [onChange, disabled]);

  const insertLink = useCallback(() => {
    const url = window.prompt('링크 URL을 입력하세요:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  const insertImage = useCallback(() => {
    const url = window.prompt('이미지 URL을 입력하세요:');
    if (url) {
      execCommand('insertImage', url);
    }
  }, [execCommand]);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    if (composingRef.current) return; // IME 조합 중에는 반영하지 않음
    const html = el.innerHTML;
    lastAppliedHtmlRef.current = html;
    onChange(html);
  }, [onChange]);

  const handleCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    composingRef.current = false;
    const el = editorRef.current;
    if (el) {
      const html = el.innerHTML;
      lastAppliedHtmlRef.current = html;
      onChange(html);
    }
  }, [onChange]);

  const MenuButton = React.memo(({ 
    onClick, 
    children, 
    title,
    isActive = false,
    disabled = false
  }: { 
    onClick: () => void; 
    children: React.ReactNode; 
    title: string;
    isActive?: boolean;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        padding: '6px 8px',
        border: '1px solid #E5E7EB',
        borderRadius: '4px',
        backgroundColor: disabled ? '#F9FAFB' : (isActive ? '#3B82F6' : '#FFFFFF'),
        color: disabled ? '#9CA3AF' : (isActive ? '#FFFFFF' : '#374151'),
        fontSize: '12px',
        fontWeight: '500',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        minWidth: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.backgroundColor = '#F3F4F6';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isActive) {
          e.currentTarget.style.backgroundColor = '#FFFFFF';
        }
      }}
      title={title}
    >
      {children}
    </button>
  ));

  return (
    <div style={style}>
      {/* 툴바 */}
      <div style={{
        border: '1px solid #D1D5DB',
        borderBottom: 'none',
        borderRadius: '8px 8px 0 0',
        padding: '8px',
        backgroundColor: '#F9FAFB',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        alignItems: 'center'
      }}>
        {/* 텍스트 스타일 */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <MenuButton onClick={() => execCommand('bold')} title="굵게" disabled={disabled}>
            <strong style={{ fontSize: '12px' }}>B</strong>
          </MenuButton>
          <MenuButton onClick={() => execCommand('italic')} title="기울임" disabled={disabled}>
            <em style={{ fontSize: '12px' }}>I</em>
          </MenuButton>
          <MenuButton onClick={() => execCommand('strikeThrough')} title="취소선" disabled={disabled}>
            <s style={{ fontSize: '12px' }}>S</s>
          </MenuButton>
          <MenuButton onClick={() => execCommand('underline')} title="밑줄" disabled={disabled}>
            <u style={{ fontSize: '12px' }}>U</u>
          </MenuButton>
        </div>
        <div style={{ width: '1px', height: '20px', backgroundColor: '#D1D5DB', margin: '0 4px' }}></div>
        {/* 헤딩 */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <MenuButton onClick={() => execCommand('formatBlock', 'h1')} title="제목 1" disabled={disabled}>
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>H1</span>
          </MenuButton>
          <MenuButton onClick={() => execCommand('formatBlock', 'h2')} title="제목 2" disabled={disabled}>
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>H2</span>
          </MenuButton>
          <MenuButton onClick={() => execCommand('formatBlock', 'h3')} title="제목 3" disabled={disabled}>
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>H3</span>
          </MenuButton>
        </div>
        <div style={{ width: '1px', height: '20px', backgroundColor: '#D1D5DB', margin: '0 4px' }}></div>
        {/* 정렬 */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <MenuButton onClick={() => execCommand('justifyLeft')} title="왼쪽 정렬"><span style={{ fontSize: '12px' }}>⬅️</span></MenuButton>
          <MenuButton onClick={() => execCommand('justifyCenter')} title="가운데 정렬"><span style={{ fontSize: '12px' }}>↔️</span></MenuButton>
          <MenuButton onClick={() => execCommand('justifyRight')} title="오른쪽 정렬"><span style={{ fontSize: '12px' }}>➡️</span></MenuButton>
        </div>
        <div style={{ width: '1px', height: '20px', backgroundColor: '#D1D5DB', margin: '0 4px' }}></div>
        {/* 색상 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500' }}>색상:</span>
          <input type="color" onChange={(e) => execCommand('foreColor', e.target.value)} style={{ width: '24px', height: '24px', border: '1px solid #D1D5DB', borderRadius: '4px', cursor: 'pointer', padding: '0' }} title="텍스트 색상" />
        </div>
        <div style={{ width: '1px', height: '20px', backgroundColor: '#D1D5DB', margin: '0 4px' }}></div>
        {/* 링크/이미지 */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <MenuButton onClick={insertLink} title="링크 추가"><span style={{ fontSize: '12px' }}>🔗</span></MenuButton>
          <MenuButton onClick={insertImage} title="이미지 추가"><span style={{ fontSize: '12px' }}>🖼️</span></MenuButton>
        </div>
        <div style={{ width: '1px', height: '20px', backgroundColor: '#D1D5DB', margin: '0 4px' }}></div>
        {/* 목록 */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <MenuButton onClick={() => execCommand('insertUnorderedList')} title="불릿 목록"><span style={{ fontSize: '10px' }}>• 목록</span></MenuButton>
          <MenuButton onClick={() => execCommand('insertOrderedList')} title="번호 목록"><span style={{ fontSize: '10px' }}>1. 목록</span></MenuButton>
        </div>
        <div style={{ width: '1px', height: '20px', backgroundColor: '#D1D5DB', margin: '0 4px' }}></div>
        {/* 인용 */}
        <MenuButton onClick={() => execCommand('formatBlock', 'blockquote')} title="인용"><span style={{ fontSize: '10px' }}>&quot; 인용</span></MenuButton>
        <div style={{ width: '1px', height: '20px', backgroundColor: '#D1D5DB', margin: '0 4px' }}></div>
        {/* 실행 취소/다시 실행 */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          <MenuButton onClick={() => execCommand('undo')} title="실행 취소"><span style={{ fontSize: '12px' }}>↶</span></MenuButton>
          <MenuButton onClick={() => execCommand('redo')} title="다시 실행"><span style={{ fontSize: '12px' }}>↷</span></MenuButton>
        </div>
      </div>

      {/* 에디터 */}
      <div style={{ border: '1px solid #D1D5DB', borderTop: 'none', borderRadius: '0 0 8px 8px', backgroundColor: '#FFFFFF' }}>
        <div
          ref={editorRef}
          contentEditable={!disabled}
          suppressContentEditableWarning={true}
          onInput={handleInput}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          style={{
            minHeight: '150px',
            padding: '12px',
            fontSize: '14px',
            fontFamily: 'inherit',
            lineHeight: '1.6',
            outline: 'none',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
            color: disabled ? '#9CA3AF' : 'inherit',
            cursor: disabled ? 'not-allowed' : 'text'
          }}
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
