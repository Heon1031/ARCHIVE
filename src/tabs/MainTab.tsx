export function MainTab() {
  return (
    <section className="tab-panel" aria-label="메인 탭">
      <div className="section-grid">
        <article className="panel-card">
          <h2>오늘 할 일</h2>
          <p>오늘 확인해야 할 콘텐츠 작업이 이 영역에 표시됩니다.</p>
        </article>
        <article className="panel-card">
          <h2>리마인드</h2>
          <p>마감, 확인 필요, API 실패 알림을 운영 작업으로 정리합니다.</p>
        </article>
        <article className="panel-card panel-card--wide">
          <h2>콘텐츠 캘린더</h2>
          <p>계정 필터 기준의 콘텐츠 일정이 캘린더 형태로 배치됩니다.</p>
        </article>
        <article className="panel-card">
          <h2>콘텐츠 기획</h2>
          <p>아이디어, 주제, 대상 계정, 예정일을 관리하는 영역입니다.</p>
        </article>
        <article className="panel-card">
          <h2>제작 상태</h2>
          <p>기획, 제작 중, 검토, 예약 예정, 완료 상태를 구분합니다.</p>
        </article>
      </div>
    </section>
  );
}
