import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProgressSteps } from '../ProgressSteps';

describe('ProgressSteps', () => {
  it('marks earlier steps as complete, current as active, later as pending', () => {
    const { container } = render(<ProgressSteps currentStep="transcribing" />);
    const steps = container.querySelectorAll('.progress-step');

    expect(steps[0]).toHaveClass('complete'); // downloading
    expect(steps[1]).toHaveClass('complete'); // extracting_audio
    expect(steps[2]).toHaveClass('active');   // transcribing
    expect(steps[3]).toHaveClass('pending');  // writing
  });

  it('marks all steps complete when done', () => {
    const { container } = render(<ProgressSteps currentStep="done" />);
    const steps = container.querySelectorAll('.progress-step');
    steps.forEach((step) => expect(step).toHaveClass('complete'));
  });

  it('marks first step as active when downloading', () => {
    const { container } = render(<ProgressSteps currentStep="downloading" />);
    const steps = container.querySelectorAll('.progress-step');
    expect(steps[0]).toHaveClass('active');
    expect(steps[1]).toHaveClass('pending');
  });
});
