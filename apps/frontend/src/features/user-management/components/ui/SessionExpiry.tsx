/** Session expiry chip: unlimited, a custom number of minutes, or the 15-minute default. */
export function SessionExpiry({minutes}: {minutes: number | null | undefined}) {
  if (minutes === 0)
    return (
      <span className="um-pill success">
        <i className="fas fa-infinity" />
        Unlimited
      </span>
    );
  if (minutes)
    return (
      <span className="um-pill primary">
        <i className="fas fa-stopwatch" />
        {minutes} min
      </span>
    );
  return (
    <span className="um-pill secondary">
      <i className="fas fa-clock" />
      Default (15m)
    </span>
  );
}
