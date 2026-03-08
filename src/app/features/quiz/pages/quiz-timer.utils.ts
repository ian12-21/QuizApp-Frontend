export const QUESTION_DURATION = 20000;

const UPDATE_FREQUENCY = 200;

export interface QuestionTimer {
  clear: () => void;
}

export function startQuestionTimer(
  onTick: (width: number) => void,
  onExpired: () => void
): QuestionTimer {
  const steps = QUESTION_DURATION / UPDATE_FREQUENCY;
  const decrementPerStep = 100 / steps;
  let currentWidth = 100;

  const interval = setInterval(() => {
    currentWidth = Math.max(0, currentWidth - decrementPerStep);
    onTick(currentWidth);
  }, UPDATE_FREQUENCY);

  const timeout = setTimeout(() => {
    clearInterval(interval);
    onExpired();
  }, QUESTION_DURATION);

  return {
    clear() {
      clearInterval(interval);
      clearTimeout(timeout);
    }
  };
}
