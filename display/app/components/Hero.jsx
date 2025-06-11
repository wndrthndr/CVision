// components/Hero.jsx (or wherever your Hero component is)
import React, { useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import InputSection from './Input'; // Assuming Input.jsx is components/Input.jsx
import AnalysisResultSection from './Analysis'; // Assuming Analysis.jsx is components/Analysis.jsx
import { Button } from '@/components/ui/button';

function Hero() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [isInputCompact, setIsInputCompact] = useState(false);

  // --- Clear Resume Function ---
  const handleClearResume = () => {
    setResumeFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
  };
  // --- End Clear Resume Function ---

  const handleFile = (files) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf") {
        setResumeFile(file);
        setError(null);
      } else {
        setResumeFile(null);
        setError("Please upload a PDF file for your resume.");
      }
    }
  };

  const handleFileChange = (event) => {
    handleFile(event.target.files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files);
  };

  const openFileInput = () => {
    fileInputRef.current.click();
  };

  const handleJobDescriptionChange = (event) => {
    setJobDescription(event.target.value);
  };

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    setIsInputCompact(false); // Ensure input section is expanded before analysis

    if (!resumeFile) {
      setError("Please select a resume PDF file.");
      setLoading(false);
      return;
    }

    if (!jobDescription.trim()) {
      setError("Please enter a job description.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('resume_file', resumeFile);
    formData.append('job_description', jobDescription);

    try {
      const response = await fetch('http://127.0.0.1:5000/analyze-job', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.raw_gemini_output) {
        setError(`AI analysis returned invalid JSON: ${data.raw_gemini_output}`);
        return;
      }
      setAnalysisResult(data);
      setIsInputCompact(true); // Compact input section after successful analysis
    } catch (e) {
      console.error("Error fetching analysis:", e);
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const getMatchCategory = (score) => {
    if (score === null || isNaN(score)) {
      return { label: 'N/A', width: '0%', colorClass: 'bg-gray-400', textColorClass: 'text-gray-400' };
    }
    if (score >= 75) {
      return { label: 'High', width: `${score}%`, colorClass: 'bg-green-500', textColorClass: 'text-green-400' };
    }
    if (score >= 50) {
      return { label: 'Medium', width: `${score}%`, colorClass: 'bg-yellow-500', textColorClass: 'text-yellow-400' };
    }
    return { label: 'Low', width: `${score}%`, colorClass: 'bg-red-500', textColorClass: 'text-red-400' };
  };

  const toggleInputCompact = () => {
    setIsInputCompact(!isInputCompact);
  };

  return (
    // REMOVED bg-black from this div. It will now be transparent,
    // allowing the three.js background from app/layout.js to show through.
    <div className="flex flex-col items-center justify-center p-4 text-white">
      <InputSection
        resumeFile={resumeFile}
        jobDescription={jobDescription}
        handleFileChange={handleFileChange}
        handleJobDescriptionChange={handleJobDescriptionChange}
        fetchAnalysis={fetchAnalysis}
        loading={loading}
        error={error}
        isDragging={isDragging}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleDrop={handleDrop}
        openFileInput={openFileInput}
        fileInputRef={fileInputRef}
        isCompact={isInputCompact}
        onToggleCompact={toggleInputCompact}
        onClearResume={handleClearResume}
      />

      <AnimatePresence>
        {analysisResult && (
          <AnalysisResultSection
            analysisResult={analysisResult}
            getMatchCategory={getMatchCategory}
          />
        )}
      </AnimatePresence>

      {/* General Error Display */}
      {error && (!resumeFile || !jobDescription.trim()) && (
        <div className="mt-8 p-4 bg-red-900 border border-red-700 text-red-200 rounded-lg max-w-300 w-full text-center">
          <h2 className="text-lg font-semibold">Error:</h2>
          <p>{error}</p>
          {error.includes("HTTP error") && <p>Please ensure your Flask backend is running and accessible at `http://127.0.0.1:5000`.</p>}
        </div>
      )}
    </div>
  );
}

export default Hero;