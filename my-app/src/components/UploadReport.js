import React, { useState } from 'react';
import axios from 'axios';

function UploadReport({ onUpload }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [question, setQuestion] = useState('');
  const [chatResponse, setChatResponse] = useState(null);
  const [progress, setProgress] = useState({ status: '', percent: 0 });

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setError(null);
    setAnalysis(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File too large. Please upload a smaller file (max 10MB).');
      return;
    }

    setUploadStatus('uploading');
    setError(null);
    setProgress({ status: 'Starting upload', percent: 0 });

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(
        'http://localhost:8000/api/analyze-report', 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 600000,  // 10 minutes timeout
          onUploadProgress: (progressEvent) => {
            const uploadPercent = (progressEvent.loaded / progressEvent.total) * 5;
            setProgress(prev => ({
              ...prev,
              status: 'Uploading file',
              percent: Math.min(uploadPercent, 5)
            }));
          }
        }
      );

      if (response.data.success) {
        if (response.data.analysis.is_medical_report) {
          setAnalysis(response.data.analysis);
          setProgress(response.data.analysis.progress);
          setUploadStatus('success');
          
          onUpload({
            name: selectedFile.name,
            analysis: response.data.analysis
          });
        } else {
          setError(response.data.analysis.error);
          setUploadStatus('error');
        }
      } else {
        throw new Error(response.data.error);
      }
    } catch (error) {
      setError(
        error.code === 'ECONNABORTED' 
          ? 'Request timed out. The file might be too large or the server is busy.'
          : error.message
      );
      setUploadStatus('error');
      console.error(error);
    }
  };

  const handleQuestion = async () => {
    if (!question || !analysis) return;

    try {
      const response = await axios.post('http://localhost:8000/api/chat-with-report', {
        text: analysis.text,
        question: question
      });

      if (response.data.success) {
        setChatResponse(response.data.response);
      } else {
        setError('Failed to process question');
      }
    } catch (error) {
      setError('Failed to process question');
      console.error(error);
    }
  };

  return (
    <section id="upload-report">
      <h2>Upload Your Health Report</h2>
      <p>Upload your PDF health report to get personalized insights and analysis</p>
      
      <div className="upload-container">
        <label className="file-upload-label">
          <input 
            type="file" 
            accept="application/pdf" 
            onChange={handleFileChange} 
          />
          Choose PDF File
        </label>
        
        <button onClick={handleUpload} disabled={!selectedFile}>
          Upload Report
        </button>
      </div>

      {uploadStatus === 'uploading' && (
        <div className="loading-animation">
          <div className="spinner"></div>
          <div className="loading-text">
            {progress.status}... ({progress.percent}%)
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progress.percent}%` }}
            ></div>
          </div>
        </div>
      )}

      {error && (
        <div className="status-message error">
          {error}
        </div>
      )}

      {analysis && analysis.is_medical_report && (
        <div className="analysis-results">
          <h3>Report Analysis</h3>
          
          <div className="analysis-section">
            <h4>Summary</h4>
            <p>{analysis.summary}</p>
          </div>

          <div className="analysis-section">
            <h4>Classification</h4>
            <p>Type: {analysis.classification.label}</p>
            <p>Confidence: {(analysis.classification.confidence * 100).toFixed(2)}%</p>
          </div>

          <div className="analysis-section">
            <h4>Key Medical Terms</h4>
            <ul>
              {analysis.entities.map((entity, index) => (
                <li key={index}>
                  {entity.text} ({entity.label}) - 
                  Confidence: {(entity.confidence * 100).toFixed(2)}%
                </li>
              ))}
            </ul>
          </div>

          <div className="analysis-section">
            <h4>Recommendations</h4>
            <ul>
              {analysis.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {analysis && analysis.is_medical_report && (
        <div className="chat-section">
          <h3>Ask Questions About the Report</h3>
          <div className="question-input">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about the report..."
            />
            <button onClick={handleQuestion}>Ask</button>
          </div>

          {chatResponse && (
            <div className="chat-response">
              <h4>Answer:</h4>
              <p>{chatResponse.answer}</p>
              {chatResponse.confidence && (
                <p className="confidence">
                  Confidence: {(chatResponse.confidence * 100).toFixed(2)}%
                </p>
              )}
              {chatResponse.relevant_text && (
                <div className="relevant-text">
                  <h4>Relevant Section:</h4>
                  <p>{chatResponse.relevant_text}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default UploadReport; 