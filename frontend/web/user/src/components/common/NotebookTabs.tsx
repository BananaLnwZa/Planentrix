export type NotebookTabId = "main" | "score" | "timer" | "test";

type NotebookTabsProps = {
  activeTab: NotebookTabId;
  onTabChange: (tab: NotebookTabId) => void;
};

const notebookTabs: Array<{
  id: NotebookTabId;
  label: string;
  color: string;
  top: string;
}> = [
  {
    id: "main",
    label: "Main",
    color: "#FFEAAE",
    top: "15%",
  },
  {
    id: "score",
    label: "Score & Homework",
    color: "#FF98D6",
    top: "27%",
  },
  {
    id: "timer",
    label: "Timer",
    color: "#FCC3A8",
    top: "39%",
  },
  {
    id: "test",
    label: "Test",
    color: "#BFE69B",
    top: "51%",
  },
];

export default function NotebookTabs({
  activeTab,
  onTabChange,
}: NotebookTabsProps) {
  const activeTabIndex = notebookTabs.findIndex((tab) => tab.id === activeTab);

  return (
    <div
      role="tablist"
      aria-label="Main notebook sections"
      className="pointer-events-none absolute inset-0 z-40 hidden md:block"
    >
      {notebookTabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        const isOnLeft = index <= activeTabIndex;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            style={{
              top: tab.top,
              backgroundColor: tab.color,
              fontFamily: "var(--font-fc-daisy)",
            }}
            className={`
              pointer-events-auto
              absolute
              flex
              h-[64px]
              w-[112px]
              -translate-y-1/2
              items-center
              justify-center
              px-4
              text-center
              text-[30px]
              leading-[0.9]
              shadow-md
              transition-all
              duration-300
              hover:brightness-105
              focus-visible:outline-2
              focus-visible:outline-offset-2
              focus-visible:outline-[#9CC5F9]
              ${
                isOnLeft
                  ? "right-[calc(100%-20px)] rounded-l-lg"
                  : "left-[calc(100%-20px)] rounded-r-lg"
              }
              ${isActive ? "text-white" : "text-gray-800"}
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
