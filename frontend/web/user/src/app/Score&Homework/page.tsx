import MainNotebookScreen from "@/components/common/MainNotebookScreen";
import ScoreHomeworkContent from "@/components/ScoreHomework/ScoreHomeworkContent";

export default function ScoreAndHomeworkPage() {
  return (
    <MainNotebookScreen activeTab="score">
      <ScoreHomeworkContent />
    </MainNotebookScreen>
  );
}
