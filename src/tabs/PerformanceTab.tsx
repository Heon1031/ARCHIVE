export function PerformanceTab() {
  return (
    <section className="tab-panel" aria-label="성과 탭">
      <div className="section-grid">
        <article className="panel-card">
          <h2>전체 성과</h2>
          <p>선택된 계정 필터 기준의 핵심 성과 요약이 표시됩니다.</p>
        </article>
        <article className="panel-card">
          <h2>플랫폼별 성과</h2>
          <p>Instagram과 Threads 성과를 플랫폼 기준으로 비교합니다.</p>
        </article>
        <article className="panel-card">
          <h2>계정별 성과</h2>
          <p>개별 계정의 API 기반 성과를 확인하는 영역입니다.</p>
        </article>
        <article className="panel-card">
          <h2>콘텐츠별 성과</h2>
          <p>콘텐츠 단위의 조회, 반응, 참여 지표가 표시됩니다.</p>
        </article>
      </div>
    </section>
  );
}
