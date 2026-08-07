import MainNotebookScreen from "@/components/common/MainNotebookScreen";
import TimerWorkspace from "@/components/Timer/TimerWorkspace";

export default function TimerPage() {
  return (
    <MainNotebookScreen activeTab="timer">
      <TimerWorkspace />
    </MainNotebookScreen>
  );
}
