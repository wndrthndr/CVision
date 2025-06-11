// components/InputSection.jsx
import React from 'react';
import GradientBorderWrapper from './Border';
import { motion } from 'framer-motion'; // Ensure motion is imported
import { Button } from '@/components/ui/button';

const InputSection = ({
  resumeFile,
  jobDescription,
  handleFileChange,
  handleJobDescriptionChange,
  fetchAnalysis,
  loading,
  error,
  isDragging,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  openFileInput,
  fileInputRef,
  isCompact,
  onToggleCompact,
  onClearResume
}) => {
  const inputSectionVariants = {
    compact: { height: '180px', transition: { duration: 0.5, ease: "easeOut" } },
    expanded: { height: 'auto', transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <GradientBorderWrapper className="w-full max-w-300 mx-auto shadow-xl">
      <motion.div
        className="p-6 overflow-hidden relative "
        variants={inputSectionVariants}
        animate={isCompact ? "compact" : "expanded"}
      >
        <h2 className="text-2xl font-bold text-white mb-4 cursor-pointer font-futuristic" onClick={onToggleCompact}>
          Resume Analysis <span className="text-gray-400 text-sm ml-2"> (Click to {isCompact ? 'expand' : 'collapse'})</span>
          {isCompact && (
            <svg className="w-6 h-6 text-gray-400 inline-block ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          )}
        </h2>

        {!isCompact && (
          <>
            <div
              className={`mb-4 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200
                ${isDragging ? 'border-blue-500 bg-gray-900' : 'border-gray-700 bg-transparent'}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={openFileInput}
            >
              <input
                type="file"
                id="resumeFile"
                accept=".pdf"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden "
              />
              {resumeFile ? (
                <p className="text-lg font-medium text-gray-200">
                  File selected: <span className="font-bold text-blue-400">{resumeFile.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onClearResume(); }}
                    className="ml-4 text-red-400 hover:text-red-300 transition-colors"
                    title="Clear selected resume"
                  >
                    <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </p>
              ) : (
                <>
                  <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v8"></path>
                  </svg>
                  <p className="text-gray-300 mb-2">Drag & drop your resume (PDF) here, or</p>
                  <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    Browse Files
                  </button>
                </>
              )}
              {error && !resumeFile && <p className="mt-2 text-sm text-red-400">{error}</p>}
            </div>

            <div className="mb-6 ">
              <label htmlFor="jobDescription" className="block text-lg font-semibold text-gray-200 mb-2 font-futuristic">
                Job Description:
              </label>
              <textarea
                id="jobDescription"
                value={jobDescription}
                onChange={handleJobDescriptionChange}
                rows="8"
                className="block w-full p-3 text-white border border-gray-700 rounded-lg bg-transparent focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                placeholder="Paste the job description here..."
              ></textarea>
            </div>

            <Button
              onClick={fetchAnalysis}
              disabled={loading || !resumeFile || !jobDescription.trim()}
              className={`
                px-8 py-3 rounded-lg text-white font-semibold w-full cursor-pointer
                transition-all duration-300 ease-in-out transform
                ${loading || !resumeFile || !jobDescription.trim()
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' // Disabled state: Gray background, gray text, no pointer
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/40' // Enabled state: Blue background, slightly darker hover, blue shadow
                }
              `}
            >
              {loading ? (
                // Conditional rendering for the loading state with Framer Motion animation
                <span className="flex items-center justify-center space-x-1">
                  <span>Analyzing</span>
                  <span className="relative w-8 h-2 overflow-hidden flex items-center"> {/* Track for the moving dot */}
                    <motion.span
                      className="h-2 w-2 rounded-full bg-white" // The actual dot styling
                      initial={{ x: -8 }} // Start slightly off the left edge of its track (assuming 1 unit = 4px for w-8, dot is 8px)
                      animate={{ x: 24 }} // Animate to the right edge of its track (32px - 8px = 24px)
                      transition={{
                        duration: 0.6, // Time for one direction of travel
                        ease: "linear",
                        repeat: Infinity, // Repeat indefinitely
                        repeatType: "mirror" // Animates forward, then backward, creating a smooth loop
                      }}
                    />
                  </span>
                  <span>...</span>
                </span>
              ) : (
                'Analyze Resume'
              )}
            </Button>
          </>
        )}
      </motion.div>
    </GradientBorderWrapper>
  );
};

export default InputSection;