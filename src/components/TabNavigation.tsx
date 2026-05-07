import type { AppTab } from "../types/models";

type TabNavigationProps = {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
};

const tabs: Array<{ value: AppTab; label: string }> = [
  { value: "main", label: "메인" },
  { value: "performance", label: "성과" },
  { value: "accountSettings", label: "계정 등록/설정" },
];

export function TabNavigation({ activeTab, onChange }: TabNavigationProps) {
  return (
    <nav className="tab-navigation" aria-label="주요 탭">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          className="tab-button"
          type="button"
          aria-selected={activeTab === tab.value}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
