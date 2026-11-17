import { useEffect, useState } from 'react';

export default function FooterClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = window.setInterval(refresh, 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return (
    <time
      className="footer-clock"
      dateTime={now.toISOString()}
      title={now.toLocaleString()}
    >
      <span>{now.toLocaleDateString(undefined, { month: 'long' })}</span>
      <strong>{now.getDate()}</strong>
      <span className="clock-weekday">
        {now.toLocaleDateString(undefined, { weekday: 'long' })}
      </span>
      <strong>
        {now.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        })}
      </strong>
    </time>
  );
}
