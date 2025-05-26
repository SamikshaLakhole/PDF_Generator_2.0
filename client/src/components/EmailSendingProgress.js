import React from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { MailCheck } from "lucide-react";

const EmailSendingProgress = ({
  sending,
  complete,
  progress,
  progressPercentage,
  pdfFiles,
  redirectToHome,
}) => {
  if (!sending && !complete) return null;

  return (
    <div className="modal flex-col p-6">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center relative w-full max-w-md mx-4 flex flex-col items-center">
        {sending && !complete && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Sending Emails...
            </h2>
            <div className="w-32 h-32 mb-4">
              <CircularProgressbar
                value={progressPercentage}
                text={`${Math.round(progressPercentage)}%`}
                styles={buildStyles({
                  strokeLinecap: "round",
                  textSize: "22px",
                  pathTransitionDuration: 0.5,
                  pathColor: "#3b82f6",
                  textColor: "#374151",
                  trailColor: "#e6e6e6",
                })}
              />
            </div>
            <p className="text-gray-600 mt-2">
              {progress} of {pdfFiles.length} emails sent
            </p>
          </>
        )}

        {complete && (
          <>
            <div className="flex items-center justify-center mb-4">
              <MailCheck size={48} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              All Emails Sent Successfully!
            </h2>
            <button onClick={redirectToHome} className="success-btn">
              OK
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailSendingProgress;
