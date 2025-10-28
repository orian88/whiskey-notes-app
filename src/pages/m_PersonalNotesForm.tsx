import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import MobileLayout from '../components/MobileLayout';

interface IPersonalNoteFormData {
  title: string;
  content: string;
  category?: string;
  tags: string[];
}

const CATEGORIES = [
  { value: '일상', label: '일상' },
  { value: '느낌', label: '느낌' },
  { value: '메모', label: '메모' },
  { value: '위스키', label: '위스키' },
  { value: '구매', label: '구매' },
  { value: '공부', label: '공부' },
  { value: '기타', label: '기타' }
];

const MobilePersonalNotesForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [formData, setFormData] = useState<IPersonalNoteFormData>({
    title: '',
    content: '',
    category: '',
    tags: []
  });

  const handleInputChange = (field: keyof IPersonalNoteFormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 해시태그 추가
  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  // 해시태그 삭제
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // 엔터키로 해시태그 추가
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      // 현재 날짜를 ISO 형식으로 가져오기
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase
        .from('personal_notes')
        .insert({
          note_date: today,
          title: formData.title,
          content: formData.content || null,
          category: formData.category || null,
          tags: formData.tags.length > 0 ? formData.tags : null
        });

      if (error) throw error;

      alert('노트가 추가되었습니다.');
      // 작은 딜레이 후 이동하여 상태가 완전히 정리되도록
      setTimeout(() => {
        navigate('/mobile/notes', { replace: false });
      }, 100);
    } catch (error) {
      console.error('노트 추가 오류:', error);
      alert('노트 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout>
      <div style={{ padding: '16px', paddingBottom: '80px' }}>
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => navigate('/mobile/notes')}
            style={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#1F2937',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <span>←</span> 목록으로
          </button>
        </div>

        <Card style={{ padding: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
            개인 노트 추가
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 제목 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                제목 *
              </label>
              <Input
                type="text"
                placeholder="노트 제목을 입력하세요"
                value={formData.title}
                onChange={(value) => handleInputChange('title', value)}
                required
              />
            </div>

            {/* 내용 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                내용
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="노트 내용을 입력하세요"
                rows={8}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                카테고리
              </label>
              <select
                value={formData.category || ''}
                onChange={(e) => handleInputChange('category', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">선택 안함</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 해시태그 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                해시태그
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <Input
                  type="text"
                  placeholder="해시태그 입력 후 Enter"
                  value={tagInput}
                  onChange={(value) => setTagInput(value)}
                  onKeyDown={handleTagInputKeyDown}
                  style={{ flex: 1 }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddTag}
                  size="sm"
                  style={{ padding: '8px 16px' }}
                >
                  추가
                </Button>
              </div>
              
              {/* 태그 목록 */}
              {formData.tags.length > 0 && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '6px',
                  padding: '8px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  backgroundColor: '#F9FAFB'
                }}>
                  {formData.tags.map((tag, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: '#DBEAFE',
                        color: '#1E40AF',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#1E40AF',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '0',
                          lineHeight: '1',
                          fontWeight: '700'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/mobile/notes')}
                style={{ flex: 1 }}
              >
                취소
              </Button>
              <Button type="submit" style={{ flex: 1 }} disabled={loading}>
                {loading ? '추가 중...' : '추가하기'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default MobilePersonalNotesForm;

