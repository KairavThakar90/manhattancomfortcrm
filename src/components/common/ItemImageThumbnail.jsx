import React, { useEffect, useState } from 'react';
import { Eye, Image as ImageIcon, Package } from 'lucide-react';

/**
 * Small product-image thumbnail used in item/line-item tables (container
 * allocated items, PO line items). Shows an animated skeleton while the
 * image is downloading, the real photo once it loads, and a "no image"
 * fallback when there's no src or the load fails.
 */
export default function ItemImageThumbnail({ src, alt, onClick }) {
  const [status, setStatus] = useState(src ? 'loading' : 'empty');

  useEffect(() => {
    setStatus(src ? 'loading' : 'empty');
  }, [src]);

  if (!src || status === 'error') {
    return (
      <div
        className="bg-mc-beige-light text-mc-gray-soft mx-auto flex h-8 w-8 flex-shrink-0 items-center justify-center rounded"
        title={status === 'error' ? 'Failed to load image' : 'No image available'}
      >
        <Package className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div
      className="group/img relative mx-auto flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-slate-200 transition-colors hover:border-slate-400"
      onClick={onClick}
    >
      {status === 'loading' && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-slate-100">
          <ImageIcon className="h-4 w-4 text-slate-300" />
        </div>
      )}
      <img
        src={src}
        alt={alt || 'Product'}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          status === 'loaded' ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
      {status === 'loaded' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover/img:bg-black/40 group-hover/img:opacity-100">
          <Eye className="h-3.5 w-3.5 text-white" />
        </div>
      )}
    </div>
  );
}
