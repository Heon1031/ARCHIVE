export function AccountSettingsTab() {
  return (
    <section className="tab-panel" aria-label="계정 등록 및 설정 탭">
      <div className="section-grid">
        <article className="panel-card panel-card--wide">
          <h2>계정 등록/설정</h2>
          <p>Instagram / Threads 계정 ID와 API 연결 정보를 관리하는 영역입니다.</p>
          <div className="placeholder-form" aria-label="계정 등록 placeholder">
            <div className="form-field">
              <label htmlFor="platform-placeholder">플랫폼</label>
              <input id="platform-placeholder" value="Instagram 또는 Threads" disabled />
            </div>
            <div className="form-field">
              <label htmlFor="account-id-placeholder">계정 ID</label>
              <input id="account-id-placeholder" value="다음 단계에서 입력 기능 연결" disabled />
            </div>
            <div className="form-field">
              <label htmlFor="token-placeholder">Access Token</label>
              <input id="token-placeholder" type="password" value="placeholder" disabled />
            </div>
            <button className="muted-action" type="button" disabled>
              API 연결 확인
            </button>
          </div>
        </article>
        <article className="panel-card">
          <h2>API 연결 상태</h2>
          <p>계정별 연결됨, 확인 필요, 실패, 토큰 만료 상태가 표시됩니다.</p>
          <div className="status-row">
            <span className="badge">연결 상태 placeholder</span>
            <span className="badge">마지막 동기화 placeholder</span>
          </div>
        </article>
        <article className="panel-card">
          <h2>보안 안내</h2>
          <p>토큰 값은 메인 탭과 성과 탭에 노출하지 않습니다.</p>
        </article>
      </div>
    </section>
  );
}
