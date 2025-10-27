import React from 'react';

interface RatingDisplayProps {
  rating?: number;
  reviewCount?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showCount?: boolean;
  showText?: boolean;
}

const RatingDisplay: React.FC<RatingDisplayProps> = ({
  rating = 0,
  reviewCount = 0,
  size = 'md', 
  showCount = true,
  showText = true
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return {
          star: 'text-xs align-middle',
          text: 'text-xs',
          container: 'gap-1'
        };
      case 'sm':
        return {
          star: 'text-sm align-middle',
          text: 'text-xs',
          container: 'gap-1'
        };
      case 'lg':
        return {
          star: 'text-lg align-middle',
          text: 'text-sm',
          container: 'gap-2'
        };
      default:
        return {
          star: 'text-base align-middle',
          text: 'text-sm',
          container: 'gap-1'
        };
    }
  };

  const getStarColor = (rating: number) => {
    if (rating >= 4.5) return '#FFD700'; // 금색 - 최고 등급
    if (rating >= 4.0) return '#FFA500'; // 주황색 - 우수 등급
    if (rating >= 3.5) return '#FF8C00'; // 진한 주황색 - 양호 등급
    if (rating >= 3.0) return '#FF6347'; // 토마토색 - 보통 등급
    if (rating >= 2.5) return '#FF4500'; // 오렌지레드 - 미흡 등급
    return '#DC143C'; // 진한 빨간색 - 부족 등급
  };

  const sizeClasses = getSizeClasses();
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  const starColor = getStarColor(rating);

  const formatReviewCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  return (
    <div className={`flex items-center ${sizeClasses.container}`}>
      {/* 별점 표시 */}
      <div className="flex items-center">
        {/* 채워진 별 */}
        {Array.from({ length: fullStars }).map((_, index) => (
          <span
            key={`full-${index}`}
            className={`${sizeClasses.star}`}
            style={{ 
              fontSize: size === 'xs' ? '10px' : size === 'sm' ? '12px' : size === 'lg' ? '18px' : '14px',
              color: starColor
            }}
          >
            ★
          </span>
        ))}
        
        {/* 반별 */}
        {hasHalfStar && (
          <span
            className={`${sizeClasses.star}`}
            style={{ 
              fontSize: size === 'xs' ? '10px' : size === 'sm' ? '12px' : size === 'lg' ? '18px' : '14px',
              color: starColor
            }}
          >
            ☆
          </span>
        )}
        
        {/* 빈 별 */}
        {Array.from({ length: emptyStars }).map((_, index) => (
          <span
            key={`empty-${index}`}
            className={`${sizeClasses.star} text-gray-300`}
            style={{ fontSize: size === 'xs' ? '10px' : size === 'sm' ? '12px' : size === 'lg' ? '18px' : '14px' }}
          >
            ☆
          </span>
        ))}
      </div>

      {/* 평점 숫자와 리뷰 개수 */}
      {showText && (
        <div className={`flex items-center text-gray-600 ml-1`} style={{ fontSize: '10px', fontWeight: '400' }}>
          <span>{rating.toFixed(1)}</span>
          {showCount && reviewCount > 0 && (
            <span className="text-gray-500 ml-1">
              ({formatReviewCount(reviewCount)})
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default RatingDisplay;
