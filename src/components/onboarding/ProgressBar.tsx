
import React from 'react';
import { Check } from 'lucide-react';
import { OnboardingStep } from '../../types/onboarding';

interface ProgressBarProps {
  currentStep: OnboardingStep;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep }) => {
  const steps = [
    { id: OnboardingStep.ORGANIZATION, label: 'Organization' },
    { id: OnboardingStep.TEAM, label: 'Team' },
    { id: OnboardingStep.EVENT, label: 'First Event' },
  ];

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between relative">
        {/* Line connection */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-indigo-600 -translate-y-1/2 z-0 transition-all duration-500 ease-in-out"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : isActive
                    ? 'bg-white border-indigo-600 text-indigo-600 shadow-lg'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="w-6 h-6" /> : <span>{step.id}</span>}
              </div>
              <span
                className={`absolute top-12 whitespace-nowrap text-xs font-semibold uppercase tracking-wider ${
                  isActive ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressBar;
