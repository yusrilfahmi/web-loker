import React, { useState } from 'react';
import { Check } from 'lucide-react';
import Step1Upload from './Step1Upload';
import Step2Analysis from './Step2Analysis';
import Step3Letter from './Step3Letter';
import Step4Merge from './Step4Merge';
import './ApplicationFlow.css';

const ApplicationFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [jobImage, setJobImage] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [letterHtml, setLetterHtml] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState([]);

  const steps = [
    { id: 1, title: 'Upload Lowongan', subtitle: 'Selesai' },
    { id: 2, title: 'Analisis AI', subtitle: 'Selesai' },
    { id: 3, title: 'Surat Lamaran', subtitle: 'AI membuat surat lamaran' },
    { id: 4, title: 'Gabung Dokumen', subtitle: 'Gabungkan semua dokumen' }
  ];

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="flow-container">
      {/* Stepper Header */}
      <div className="stepper-wrapper">
        <div className="stepper">
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            
            return (
              <React.Fragment key={step.id}>
                <div className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  <div className="step-circle">
                    {isCompleted ? <Check size={16} /> : step.id}
                  </div>
                  <div className="step-text">
                    <span className="step-title">{step.id} {step.title}</span>
                    <span className="step-desc">{step.subtitle}</span>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`step-line ${currentStep > index + 1 ? 'completed-line' : ''}`}></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="step-content-area">
        {currentStep === 1 && (
          <Step1Upload 
            onNext={(imageUrl, extractedData) => {
              setJobImage(imageUrl);
              setAiData(extractedData);
              nextStep();
            }} 
          />
        )}
        {currentStep === 2 && (
          <Step2Analysis 
            jobImage={jobImage} 
            aiData={aiData} 
            onNext={nextStep} 
            onBack={prevStep} 
          />
        )}
        {currentStep === 3 && (
          <Step3Letter 
            aiData={aiData}
            onNext={(html, attachments) => {
              if (html) setLetterHtml(html);
              if (attachments) setSelectedAttachments(attachments);
              nextStep();
            }}
            onBack={prevStep}
          />
        )}
        {currentStep === 4 && (
          <Step4Merge 
            jobImage={jobImage}
            aiData={aiData}
            letterHtml={letterHtml}
            initialAttachments={selectedAttachments}
            onBack={prevStep}
          />
        )}
      </div>
    </div>
  );
};

export default ApplicationFlow;
