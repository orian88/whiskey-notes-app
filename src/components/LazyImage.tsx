import React, { useState, useRef, useEffect, memo } from 'react';

interface ILazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
}

const LazyImage: React.FC<ILazyImageProps> = memo(({
  src,
  alt,
  className = '',
  style = {},
  placeholder = <div className="animate-pulse bg-gray-200 rounded" />,
  fallback = <div className="text-4xl">🥃</div>
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
  };

  return (
    <div ref={imgRef} className={className} style={style}>
      {!isInView && placeholder}
      {isInView && !isLoaded && !hasError && placeholder}
      {isInView && hasError && fallback}
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            ...style,
            display: isLoaded && !hasError ? 'block' : 'none'
          }}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;
