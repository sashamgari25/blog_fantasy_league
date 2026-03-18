export default function Loading() {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-label="Loading page">
      <div className="loading-card">
        <div className="loading-mark">XI</div>
        <div className="loading-copy">
          <p className="eyebrow">IPL Fantasy Faceoff</p>
          <h2>Loading next over</h2>
          <p className="subhead">Pulling in the latest rivalry update.</p>
        </div>
        <div className="loading-bar" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}
