import { useMemo, useState } from "react";
import { AccountFilter } from "./components/AccountFilter";
import { AppShell } from "./components/AppShell";
import { TabNavigation } from "./components/TabNavigation";
import { AccountSettingsTab } from "./tabs/AccountSettingsTab";
import { MainTab } from "./tabs/MainTab";
import { PerformanceTab } from "./tabs/PerformanceTab";
import type { Account, AccountFilterValue, AppTab } from "./types/models";

const initialFilter: AccountFilterValue = { type: "all" };

function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("main");
  const [accountFilter, setAccountFilter] = useState<AccountFilterValue>(initialFilter);
  const accounts = useMemo<Account[]>(() => [], []);

  return (
    <AppShell
      title="콘텐츠 운영 대시보드"
      description="Instagram / Threads API 연결을 우선하는 멀티 계정 운영 도구"
    >
      <TabNavigation activeTab={activeTab} onChange={setActiveTab} />
      <AccountFilter accounts={accounts} value={accountFilter} onChange={setAccountFilter} />

      {activeTab === "main" && <MainTab />}
      {activeTab === "performance" && <PerformanceTab />}
      {activeTab === "accountSettings" && <AccountSettingsTab />}
    </AppShell>
  );
}

export default App;
