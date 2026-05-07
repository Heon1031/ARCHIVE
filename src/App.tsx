import { useEffect, useMemo, useState } from "react";
import { AccountFilter } from "./components/AccountFilter";
import { AppShell } from "./components/AppShell";
import { TabNavigation } from "./components/TabNavigation";
import { storage } from "./lib/storage";
import { AccountSettingsTab } from "./tabs/AccountSettingsTab";
import { MainTab } from "./tabs/MainTab";
import { PerformanceTab } from "./tabs/PerformanceTab";
import type { Account, AccountFilterValue, AppTab, ContentItem, InsightRecord } from "./types/models";

const initialFilter: AccountFilterValue = { type: "all" };

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("main");
  const [accountFilter, setAccountFilter] = useState<AccountFilterValue>(initialFilter);
  const [accounts, setAccounts] = useState<Account[]>(() => storage.loadAccounts());
  const [contents, setContents] = useState<ContentItem[]>(() => storage.loadContents());
  const [insights] = useState<InsightRecord[]>(() => storage.loadInsights());
  const filterAccounts = useMemo(
    () => accounts.filter((account) => account.isActive),
    [accounts],
  );

  useEffect(() => {
    storage.saveAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    storage.saveContents(contents);
  }, [contents]);

  return (
    <AppShell
      title="콘텐츠 운영 대시보드"
      description="Instagram / Threads API 연결을 우선하는 멀티 계정 운영 도구"
    >
      <TabNavigation activeTab={activeTab} onChange={setActiveTab} />
      <AccountFilter accounts={filterAccounts} value={accountFilter} onChange={setAccountFilter} />

      {activeTab === "main" && (
        <MainTab
          accounts={filterAccounts}
          contents={contents}
          accountFilter={accountFilter}
          onContentsChange={setContents}
          onOpenAccountSettings={() => setActiveTab("accountSettings")}
        />
      )}
      {activeTab === "performance" && (
        <PerformanceTab
          accounts={accounts}
          contents={contents}
          insights={insights}
          accountFilter={accountFilter}
        />
      )}
      {activeTab === "accountSettings" && (
        <AccountSettingsTab accounts={accounts} onAccountsChange={setAccounts} />
      )}
    </AppShell>
  );
}

export default App;
