import { useState, useRef, useEffect, useCallback, RefObject } from 'react';

export interface UseCanvasZoomPanOptions {
  canvasContainerRef: RefObject<HTMLDivElement | null>;
  labelCanvasRef: RefObject<HTMLDivElement | null>;
  templateWidthMm: number;
  templateHeightMm: number;
  zoomMethod?: 'pointer' | 'center';
  defaultZoom?: number;
}

export type CanvasTool = 'select' | 'marquee' | 'pan';

export function useCanvasZoomPan({
  canvasContainerRef,
  labelCanvasRef,
  templateWidthMm,
  templateHeightMm,
  zoomMethod = 'pointer',
  defaultZoom = 1.25,
}: UseCanvasZoomPanOptions) {
  const [zoom, setZoom] = useState(defaultZoom);
  const [activeTool, setActiveTool] = useState<CanvasTool>('select');

  // Marquee Drag-to-Zoom State
  const [isZoomMarquee, setIsZoomMarquee] = useState(false);
  const [zoomMarqueeStart, setZoomMarqueeStart] = useState<{ x_mm: number; y_mm: number } | null>(null);
  const [zoomMarqueeRect, setZoomMarqueeRect] = useState<{
    x_mm: number;
    y_mm: number;
    w_mm: number;
    h_mm: number;
  } | null>(null);

  // Hand Pan Tool State
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  // Pointer-Centric & Anchor Zoom Engine
  const handleZoomWithAnchor = useCallback(
    (nextZoom: number, anchorPoint?: { clientX: number; clientY: number }) => {
      const clampedZoom = Math.min(8.0, Math.max(0.1, Number(nextZoom.toFixed(3))));
      if (clampedZoom === zoom) return;

      if (!canvasContainerRef.current || !labelCanvasRef.current) {
        setZoom(clampedZoom);
        return;
      }

      const container = canvasContainerRef.current;
      const canvas = labelCanvasRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      let clientX: number;
      let clientY: number;

      if (anchorPoint) {
        clientX = anchorPoint.clientX;
        clientY = anchorPoint.clientY;
      } else {
        // Center of the visible viewport container
        clientX = containerRect.left + container.clientWidth / 2;
        clientY = containerRect.top + container.clientHeight / 2;
      }

      const pointMmX = (clientX - canvasRect.left) / (3.78 * zoom);
      const pointMmY = (clientY - canvasRect.top) / (3.78 * zoom);

      const deltaScrollX = pointMmX * 3.78 * (clampedZoom - zoom);
      const deltaScrollY = pointMmY * 3.78 * (clampedZoom - zoom);

      setZoom(clampedZoom);

      container.scrollLeft += deltaScrollX;
      container.scrollTop += deltaScrollY;
    },
    [zoom, canvasContainerRef, labelCanvasRef]
  );

  // Preset zoom methods: Fit to Sheet & Fit to Width
  const handleFitToSheet = useCallback(() => {
    if (!canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const availW = Math.max(100, container.clientWidth - 120);
    const availH = Math.max(100, container.clientHeight - 120);
    const scaleW = availW / (templateWidthMm * 3.78);
    const scaleH = availH / (templateHeightMm * 3.78);
    const fitZoom = Math.min(8.0, Math.max(0.1, Number(Math.min(scaleW, scaleH).toFixed(2))));
    setZoom(fitZoom);

    requestAnimationFrame(() => {
      if (!canvasContainerRef.current || !labelCanvasRef.current) return;
      const cont = canvasContainerRef.current;
      const canvas = labelCanvasRef.current;
      cont.scrollLeft = Math.max(0, (canvas.offsetWidth - cont.clientWidth) / 2);
      cont.scrollTop = Math.max(0, (canvas.offsetHeight - cont.clientHeight) / 2);
    });
  }, [templateWidthMm, templateHeightMm, canvasContainerRef, labelCanvasRef]);

  const handleFitToWidth = useCallback(() => {
    if (!canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const availW = Math.max(100, container.clientWidth - 120);
    const scaleW = availW / (templateWidthMm * 3.78);
    const fitZoom = Math.min(8.0, Math.max(0.1, Number(scaleW.toFixed(2))));
    setZoom(fitZoom);
  }, [templateWidthMm, canvasContainerRef]);

  // Non-passive wheel event listener for Pointer-Centric zoom
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const isPointerCentric = zoomMethod === 'pointer';
      const isCtrlKey = e.ctrlKey || e.metaKey;

      if (isPointerCentric || isCtrlKey) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const targetZoom = zoom * factor;
        handleZoomWithAnchor(targetZoom, { clientX: e.clientX, clientY: e.clientY });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, zoomMethod, handleZoomWithAnchor, canvasContainerRef]);

  return {
    zoom,
    setZoom,
    activeTool,
    setActiveTool,
    isZoomMarquee,
    setIsZoomMarquee,
    zoomMarqueeStart,
    setZoomMarqueeStart,
    zoomMarqueeRect,
    setZoomMarqueeRect,
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    handleZoomWithAnchor,
    handleFitToSheet,
    handleFitToWidth,
  };
}
