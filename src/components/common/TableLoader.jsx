import React from 'react';

/**
 * TableLoader Component (MUI Table Linear Progress Bar style)
 * Placed between header and content, rendering a sleek MUI DataGrid style linear progress bar.
 */
export default function TableLoader() {
  return (
    <div className="relative w-full h-1 bg-indigo-100/70 overflow-hidden">
      <style>{`
        @keyframes muiLinearProgress1 {
          0% {
            left: -35%;
            right: 100%;
          }
          60% {
            left: 100%;
            right: -90%;
          }
          100% {
            left: 100%;
            right: -90%;
          }
        }
        @keyframes muiLinearProgress2 {
          0% {
            left: -200%;
            right: 100%;
          }
          60% {
            left: 107%;
            right: -8%;
          }
          100% {
            left: 107%;
            right: -8%;
          }
        }
        .mui-progress-bar1 {
          position: absolute;
          top: 0;
          bottom: 0;
          background-color: #4f46e5;
          animation: muiLinearProgress1 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
        }
        .mui-progress-bar2 {
          position: absolute;
          top: 0;
          bottom: 0;
          background-color: #6366f1;
          animation: muiLinearProgress2 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) 1.15s infinite;
        }
      `}</style>
      <div className="mui-progress-bar1" />
      <div className="mui-progress-bar2" />
    </div>
  );
}
