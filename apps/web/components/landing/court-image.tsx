/**
 * CourtImage (Client Component)
 * ---------------------------------------------------------------------------
 * Imagen de cancha con fallback automático. Si la URL principal falla
 * (404 o error de red), se cae a `fallbackSrc`. Vive como Client Component
 * porque el handler `onError` no puede pasarse desde un Server Component.
 */

'use client';

import * as React from 'react';

interface Props {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
}

export function CourtImage({ src, fallbackSrc, alt, className }: Props) {
  const [currentSrc, setCurrentSrc] = React.useState(src);

  // Si cambia la `src` desde afuera (re-render con otra cancha), reseteamos.
  React.useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (currentSrc !== fallbackSrc) setCurrentSrc(fallbackSrc);
      }}
      className={className}
    />
  );
}
