import { useState, useCallback } from 'react';
import { LabelTemplate } from '../types';

export function useCanvasHistory(initialTemplate: LabelTemplate, maxDepth = 30) {
  const [template, setTemplate] = useState<LabelTemplate>(initialTemplate);
  const [history, setHistory] = useState<LabelTemplate[]>([initialTemplate]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushState = useCallback(
    (newTemplate: LabelTemplate) => {
      setHistory((prevHistory) => {
        const nextHist = prevHistory.slice(0, historyIndex + 1);
        nextHist.push(newTemplate);
        if (nextHist.length > maxDepth) nextHist.shift();
        setHistoryIndex(nextHist.length - 1);
        return nextHist;
      });
      setTemplate(newTemplate);
    },
    [historyIndex, maxDepth]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      setHistoryIndex((prev) => prev - 1);
      setTemplate(target);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      setHistoryIndex((prev) => prev + 1);
      setTemplate(target);
    }
  }, [history, historyIndex]);

  return {
    template,
    setTemplate,
    history,
    historyIndex,
    pushState,
    handleUndo,
    handleRedo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
}
