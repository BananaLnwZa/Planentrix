"use client";

import { useState } from "react";
import MainNotebookScreen from "@/components/common/MainNotebookScreen";
import Schedule from "@/components/Main/Schedule";
import StudentCard from "@/components/Main/StudentCard";
import Term from "@/components/Main/Term";
import MainNotificationCard from "@/components/Main/MainNotificationCard";
import RecommendationCard from "@/components/Main/RecommendationCard";

export default function MainPage() {
  const [termVersion, setTermVersion] = useState(0);
  const [scheduleVersion, setScheduleVersion] = useState(0);
  const [recommendationVersion, setRecommendationVersion] = useState(0);
  const [alertVersion, setAlertVersion] = useState(0);

  const handleTermChange = () => {
    setTermVersion((version) => version + 1);
    setScheduleVersion((version) => version + 1);
    setRecommendationVersion((version) => version + 1);
  };

  return (
    <MainNotebookScreen activeTab="main">
      <div className="grid h-full min-h-0 w-full grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
        <div className="relative flex h-full min-h-0 flex-col items-center gap-3 md:-translate-x-3">
          <div className="flex w-full max-w-[440px] shrink-0 items-stretch gap-3">
            <div className="w-[42%] min-w-0">
              <Term
                compact
                onConfirm={handleTermChange}
                onEndTerm={handleTermChange}
              />
            </div>
            <MainNotificationCard
              refreshKey={
                termVersion +
                scheduleVersion +
                recommendationVersion +
                alertVersion
              }
            />
          </div>
          <Schedule
            key={termVersion}
            refreshKey={scheduleVersion}
            onChanged={() => setAlertVersion((version) => version + 1)}
          />
        </div>
        <div className="flex h-full min-h-0 flex-col items-center gap-4 overflow-hidden md:translate-x-3">
          <div className="flex w-full shrink-0 justify-center">
            <StudentCard
              key={termVersion}
              onConstraintUpdated={() =>
                setRecommendationVersion((version) => version + 1)
              }
            />
          </div>
          <RecommendationCard
            refreshKey={recommendationVersion + termVersion}
            onAccepted={() => setScheduleVersion((version) => version + 1)}
          />
        </div>
      </div>
    </MainNotebookScreen>
  );
}
