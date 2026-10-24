import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="offline-banner" role="status">
      אין חיבור. השינויים יישמרו ויסונכרנו כשהחיבור יחזור.
    </div>
  );
}
