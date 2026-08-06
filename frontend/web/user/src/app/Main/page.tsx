"use client";

import { useState } from "react";
import MainNotebookScreen from "@/components/common/MainNotebookScreen";
import Schedule from "@/components/Main/Schedule";
import StudentCard from "@/components/Main/StudentCard";
import Term from "@/components/Main/Term";

export default function MainPage() {
  const [termVersion, setTermVersion] = useState(0);

  return (
    <MainNotebookScreen activeTab="main">
      <div className="grid h-full min-h-0 w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
        <div className="flex h-full min-h-0 flex-col items-center gap-3 md:-translate-x-3">
          <Term
            onConfirm={() => setTermVersion((version) => version + 1)}
            onEndTerm={() => setTermVersion((version) => version + 1)}
          />
          <Schedule key={termVersion} />
        </div>
        <div className="flex h-full items-start justify-center md:translate-x-3">
          <StudentCard key={termVersion} />
        </div>
      </div>
    </MainNotebookScreen>
  );
}
