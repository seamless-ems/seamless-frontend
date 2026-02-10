
import React from 'react';

interface StepContainerProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  isNextDisabled?: boolean;
}

const StepContainer: React.FC<StepContainerProps> = ({
  title,
  subtitle,
  children,
  onNext,
  onBack,
  nextLabel = 'Continue',
  isNextDisabled = false,
}) => {
  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
      <div className="p-8 md:p-12">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-500">{subtitle}</p>
        </header>

        <div className="space-y-6">
          {children}
        </div>

        <div className="mt-12 flex items-center justify-between">
          {onBack ? (
            <button
              onClick={onBack}
              className="px-6 py-3 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
            >
              Go Back
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onNext}
            disabled={isNextDisabled}
            className={`px-8 py-3 rounded-xl font-bold text-white transition-all transform active:scale-95 ${
              isNextDisabled
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200'
            }`}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepContainer;
