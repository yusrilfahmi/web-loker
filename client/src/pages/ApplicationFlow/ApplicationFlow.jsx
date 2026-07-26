import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import Step1Upload from './Step1Upload';
import Step2Analysis from './Step2Analysis';
import Step3Letter from './Step3Letter';
import './ApplicationFlow.css';

const ApplicationFlow = () => {
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = sessionStorage.getItem('appFlowState');
    return saved ? JSON.parse(saved).currentStep || 1 : 1;
  });
  const [jobImage, setJobImage] = useState(() => {
    const saved = sessionStorage.getItem('appFlowState');
    return saved ? JSON.parse(saved).jobImage || null : null;
  });
  const [aiData, setAiData] = useState(() => {
    const saved = sessionStorage.getItem('appFlowState');
    return saved ? JSON.parse(saved).aiData || null : null;
  });

  useEffect(() => {
    sessionStorage.setItem('appFlowState', JSON.stringify({ currentStep, jobImage, aiData }));
  }, [currentStep, jobImage, aiData]);

  const handleComplete = () => {
    sessionStorage.removeItem('appFlowState');
  };

  const steps = [
    { id: 1, title: 'Upload Lowongan', subtitle: 'Selesai' },
    { id: 2, title: 'Analisis AI', subtitle: 'Selesai' },
    { id: 3, title: 'Surat Lamaran', subtitle: 'Edit & Gabung' }
  ];

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
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
            onUpdateData={(updatedData) => setAiData(updatedData)}
          />
        )}
        {currentStep === 3 && (
          <Step3Letter 
            jobImage={jobImage}
            aiData={aiData}
            onBack={prevStep}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
};

export default ApplicationFlow;
