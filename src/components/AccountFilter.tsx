import type { Account, AccountFilterValue } from "../types/models";

type AccountFilterProps = {
  accounts: Account[];
  value: AccountFilterValue;
  onChange: (value: AccountFilterValue) => void;
};

function serializeFilter(value: AccountFilterValue) {
  if (value.type === "all") {
    return "all";
  }

  if (value.type === "platform") {
    return `platform:${value.platform}`;
  }

  return `account:${value.accountId}`;
}

function parseFilter(value: string): AccountFilterValue {
  if (value === "platform:instagram") {
    return { type: "platform", platform: "instagram" };
  }

  if (value === "platform:threads") {
    return { type: "platform", platform: "threads" };
  }

  if (value.startsWith("account:")) {
    return { type: "account", accountId: value.replace("account:", "") };
  }

  return { type: "all" };
}

export function AccountFilter({ accounts, value, onChange }: AccountFilterProps) {
  return (
    <label className="account-filter">
      <span className="filter-label">보기 기준</span>
      <select
        className="filter-select"
        value={serializeFilter(value)}
        onChange={(event) => onChange(parseFilter(event.target.value))}
      >
        <option value="all">전체 계정</option>
        {accounts.some((account) => account.platform === "instagram") && (
          <option value="platform:instagram">Instagram 전체</option>
        )}
        {accounts.some((account) => account.platform === "threads") && (
          <option value="platform:threads">Threads 전체</option>
        )}
        {accounts.map((account) => (
          <option key={account.id} value={`account:${account.id}`}>
            {account.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}
