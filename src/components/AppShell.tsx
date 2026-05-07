import type { ReactNode } from "react";

type AppShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AppShell({ title, description, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <h1 className="app-title">{title}</h1>
          <p className="app-description">{description}</p>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
