import React, { useEffect, useRef, useState } from 'react';

const AdSense = ({ adSlot, adFormat = 'auto', fullWidthResponsive = true }) => {
  const insRef = useRef(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }

    let cancelled = false;
    const startedAt = Date.now();

    const checkFilled = () => {
      if (cancelled) return;
      const el = insRef.current;
      if (!el) return;

      const status = el.getAttribute('data-ad-status');
      if (status === 'unfilled') {
        setIsCollapsed(true);
        return;
      }

      const rect = el.getBoundingClientRect();
      if (rect.height > 10) {
        setIsCollapsed(false);
        return;
      }

      if ((Date.now() - startedAt) < 4000) {
        setTimeout(checkFilled, 250);
      }
    };

    setTimeout(checkFilled, 250);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="adsense-container" style={{ display: isCollapsed ? 'none' : 'block', margin: 0, padding: 0 }}>
      <ins
        className="adsbygoogle"
        ref={insRef}
        style={{ display: 'block' }}
        data-ad-client="ca-pub-9097893369149135"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive.toString()}
      ></ins>
    </div>
  );
};

export default AdSense;
