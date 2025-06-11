'use client'; // Required for client-side hooks and interactive components like framer-motion

import React from 'react';
import GradientBorderWrapper from './Border';
import { motion } from 'framer-motion';

// Helper component for styled sections with a colored vertical line
const StyledSection = ({ title, children, titleColor, lineHeightColor }) => (
  // Removed bgColor and borderColor props from here and set bg-black directly
  <div className={`mb-6 p-4 rounded-lg bg-black relative pl-6`}>
    {/* Vertical line as a pseudo-element for consistent styling */}
    <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-full ${lineHeightColor}`}></span>
    <h3 className={`text-xl font-semibold ${titleColor} mb-3`}>{title}</h3>
    {children}
  </div>
);

const AnalysisResultSection = ({ analysisResult, getMatchCategory }) => {
  const analysisPanelVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut", delay: 0.2 } },
    exit: { opacity: 0, y: 20, transition: { duration: 0.5, ease: "easeIn" } },
  };

  return (
    // Corrected max-w-300 to max-w-2xl, which is a standard Tailwind max-width utility
    <GradientBorderWrapper className="w-full max-w-300 mx-auto mt-8 shadow-xl">
      <motion.div
        key="analysis-result"
        className="p-6" // Explicitly set bg-black for the content area
        variants={analysisPanelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <h2 className="text-2xl font-bold text-white mb-4 syncopate-regular ">Analysis Result:</h2>

        {/* Overall Match Score - Bar Component (Updated colors for dark theme) */}
        <StyledSection
          title="Overall Match Score:"
          titleColor="text-blue-300"
          lineHeightColor="bg-blue-500" // Color for the vertical line
        >
          {analysisResult?.gemini_analysis?.overall_match_score !== undefined ? (
            <>
              <div className="w-full bg-gray-900 rounded-full h-6 mb-2 overflow-hidden">
                <div
                  className={`${getMatchCategory(analysisResult.gemini_analysis.overall_match_score).colorClass} h-full rounded-full transition-all duration-700 ease-out`}
                  style={{ width: getMatchCategory(analysisResult.gemini_analysis.overall_match_score).width }}
                ></div>
              </div>
              <span className={`text-4xl font-extrabold ${getMatchCategory(analysisResult.gemini_analysis.overall_match_score).textColorClass}`}>
                {analysisResult.gemini_analysis?.overall_match_score}% - {getMatchCategory(analysisResult.gemini_analysis.overall_match_score).label}
              </span>
              <p className="text-sm text-gray-400 mt-2">
                Score: 0-49% (Low), 50-74% (Medium), 75-100% (High)
              </p>
            </>
          ) : (
            <p className="text-gray-400">No score available.</p>
          )}
        </StyledSection>

        {/* Key Strengths */}
        {analysisResult.gemini_analysis?.key_strengths?.length > 0 && (
          <StyledSection
            title="Key Strengths:"
            titleColor="text-green-300"
            lineHeightColor="bg-green-500"
          >
            <ul className="list-disc list-inside space-y-2 text-gray-200">
              {analysisResult.gemini_analysis.key_strengths.map((strength, index) => (
                <li key={`strength-${index}`}>{strength}</li>
              ))}
            </ul>
          </StyledSection>
        )}

        {/* Areas for Improvement */}
        {analysisResult.gemini_analysis?.areas_for_improvement?.length > 0 && (
          <StyledSection
            title="Areas for Improvement:"
            titleColor="text-red-300"
            lineHeightColor="bg-red-500"
          >
            <ul className="list-disc list-inside space-y-2 text-gray-200">
              {analysisResult.gemini_analysis.areas_for_improvement.map((area, index) => (
                <li key={`improvement-${index}`}>{area}</li>
              ))}
            </ul>
          </StyledSection>
        )}

        {/* Actionable Feedback */}
        {analysisResult.gemini_analysis?.actionable_feedback && (
          <StyledSection
            title="Actionable Feedback:"
            titleColor="text-yellow-300"
            lineHeightColor="bg-yellow-500"
          >
            <p className="text-gray-200">{analysisResult.gemini_analysis.actionable_feedback}</p>
          </StyledSection>
        )}

        {/* Extracted Key Skills */}
        {analysisResult.gemini_analysis?.extracted_key_skills?.length > 0 && (
          <StyledSection
            title="Extracted Key Skills:"
            titleColor="text-purple-300"
            lineHeightColor="bg-purple-500"
          >
            <div className="flex flex-wrap gap-2">
              {analysisResult.gemini_analysis.extracted_key_skills.map((skill, index) => (
                <span
                  key={`skill-${index}`}
                  // Corrected background color for skill pills
                  className="bg-purple-700 text-purple-200 text-sm font-medium px-3 py-1 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </StyledSection>
        )}

        {/* Missing Key Skills - Re-added this section */}
        {analysisResult.gemini_analysis?.missing_key_skills?.length > 0 && (
          <StyledSection
            title="Missing Key Skills:"
            titleColor="text-orange-300"
            lineHeightColor="bg-orange-500"
          >
            <div className="flex flex-wrap gap-2">
              {analysisResult.gemini_analysis.missing_key_skills.map((skill, index) => (
                <span
                  key={`missing-skill-${index}`}
                  className="bg-orange-700 text-orange-200 text-sm font-medium px-3 py-1 rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </StyledSection>
        )}

      
      </motion.div>
    </GradientBorderWrapper>
  );
};

export default AnalysisResultSection;