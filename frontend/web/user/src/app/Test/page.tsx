import MainNotebookScreen from "@/components/common/MainNotebookScreen";
import TestWorkspace from "@/components/Test/TestWorkspace";

export default function TestPage() {
  return (
    <MainNotebookScreen activeTab="test">
      <TestWorkspace />
    </MainNotebookScreen>
  );
}
