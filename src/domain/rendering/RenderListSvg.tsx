/**
 * E-Studio SVG RenderList Component
 * Conforms to SECTION 10 & 11: ONE LAYOUT TRUTH
 * 
 * Direct SVG renderer consuming the canonical RenderList.
 * Used for high-fidelity live label preview and interactive canvas representation.
 */

import React, { useEffect, useState } from 'react';
import { RenderList, RenderPrimitive, TextPrimitive, PriceBlockPrimitive, RectPrimitive, BarcodePrimitive, LinePrimitive } from './renderList';
import QRCode from 'qrcode';

interface RenderListSvgProps {
  renderList: RenderList;
  className?: string;
  zoom?: number;
  highlightElementId?: string;
  onElementClick?: (elementId: string) => void;
  showGuides?: boolean;
}

export const RenderListSvg: React.FC<RenderListSvgProps> = ({
  renderList,
  className = '',
  zoom = 1,
  highlightElementId,
  onElementClick,
  showGuides = false,
}) => {
  const { widthMm, heightMm, primitives } = renderList;
  const [qrCache, setQrCache] = useState<Record<string, string>>({});

  // Asynchronously generate QR codes for QR primitives
  useEffect(() => {
    const qrPrimitives = primitives.filter((p) => p.type === 'qr');
    qrPrimitives.forEach(async (qp) => {
      if (!qrCache[qp.id]) {
        try {
          const url = await QRCode.toDataURL((qp as any).value, { margin: 0 });
          setQrCache((prev) => ({ ...prev, [qp.id]: url }));
        } catch {
          // ignore
        }
      }
    });
  }, [primitives]);

  return (
    <div
      className={`relative inline-block select-none ${className}`}
      style={{
        width: `${widthMm * 3.7795275591 * zoom}px`, // 1 mm = 3.78 px at 96 DPI
        height: `${heightMm * 3.7795275591 * zoom}px`,
      }}
    >
      <svg
        viewBox={`0 0 ${widthMm} ${heightMm}`}
        className="w-full h-full bg-white shadow-md rounded-[1px] overflow-hidden"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Render each primitive */}
        {primitives.map((p) => {
          const isHighlighted = highlightElementId === p.id;

          return (
            <g
              key={p.id}
              onClick={(e) => {
                e.stopPropagation();
                onElementClick?.(p.id);
              }}
              className="cursor-pointer"
            >
              {p.type === 'rect' && (
                <rect
                  x={p.xMm}
                  y={p.yMm}
                  width={p.widthMm}
                  height={p.heightMm}
                  fill={(p as RectPrimitive).fillColor || 'transparent'}
                  stroke={isHighlighted ? '#2563eb' : (p as RectPrimitive).strokeColor || 'none'}
                  strokeWidth={isHighlighted ? 0.8 : (p as RectPrimitive).strokeWidthMm || 0.3}
                  rx={(p as RectPrimitive).borderRadiusMm || 0}
                  ry={(p as RectPrimitive).borderRadiusMm || 0}
                />
              )}

              {p.type === 'line' && (
                <line
                  x1={p.xMm}
                  y1={p.yMm}
                  x2={(p as LinePrimitive).x2Mm}
                  y2={(p as LinePrimitive).y2Mm}
                  stroke={isHighlighted ? '#2563eb' : (p as LinePrimitive).strokeColor || '#94a3b8'}
                  strokeWidth={(p as LinePrimitive).strokeWidthMm || 0.3}
                />
              )}

              {p.type === 'text' && (
                <text
                  x={
                    (p as TextPrimitive).textAlign === 'center'
                      ? p.xMm + p.widthMm / 2
                      : (p as TextPrimitive).textAlign === 'right'
                      ? p.xMm + p.widthMm
                      : p.xMm
                  }
                  y={p.yMm + Math.min(p.heightMm * 0.8, ((p as TextPrimitive).fontSizePt * 0.352778) * 0.95)}
                  fontSize={`${(p as TextPrimitive).fontSizePt * 0.352778}mm`}
                  fontWeight={(p as TextPrimitive).fontWeight || 'normal'}
                  fontFamily={(p as TextPrimitive).fontFamily || 'Plus Jakarta Sans, sans-serif'}
                  fill={(p as TextPrimitive).color || '#0f172a'}
                  textAnchor={
                    (p as TextPrimitive).textAlign === 'center'
                      ? 'middle'
                      : (p as TextPrimitive).textAlign === 'right'
                      ? 'end'
                      : 'start'
                  }
                >
                  {(p as TextPrimitive).text}
                </text>
              )}

              {p.type === 'price_block' && (
                <g transform={`translate(${p.xMm}, ${p.yMm})`}>
                  {/* Promo Badge */}
                  {(p as PriceBlockPrimitive).hasDiscount && (
                    <g transform="translate(0, 0)">
                      <rect x="0" y="0" width="14" height="4.5" rx="0.8" fill="#dc2626" />
                      <text x="7" y="3.3" fill="#ffffff" fontSize="2.8mm" fontWeight="bold" textAnchor="middle">
                        PROMO
                      </text>
                      {(p as PriceBlockPrimitive).slots.discountPercentage && (
                        <g transform="translate(15, 0)">
                          <rect x="0" y="0" width="11" height="4.5" rx="0.8" fill="#000000" />
                          <text x="5.5" y="3.3" fill="#ffffff" fontSize="2.8mm" fontWeight="bold" textAnchor="middle">
                            {(p as PriceBlockPrimitive).slots.discountPercentage}
                          </text>
                        </g>
                      )}
                    </g>
                  )}

                  {/* Main Price Numbers */}
                  <text
                    x="0"
                    y={p.heightMm * 0.72}
                    fontSize={`${(p as PriceBlockPrimitive).fontSizePt * 0.352778}mm`}
                    fontWeight="800"
                    fill={(p as PriceBlockPrimitive).hasDiscount ? '#dc2626' : (p as PriceBlockPrimitive).primaryColor}
                    fontFamily="Oswald, sans-serif"
                  >
                    {(p as PriceBlockPrimitive).slots.integerPart}
                  </text>

                  {/* Decimals & Currency Symbol */}
                  <text
                    x={((p as PriceBlockPrimitive).slots.integerPart.length * ((p as PriceBlockPrimitive).fontSizePt * 0.352778) * 0.52) + 0.8}
                    y={p.heightMm * 0.45}
                    fontSize={`${Math.max(2.8, (p as PriceBlockPrimitive).fontSizePt * 0.352778 * 0.45)}mm`}
                    fontWeight="700"
                    fill={(p as PriceBlockPrimitive).hasDiscount ? '#dc2626' : (p as PriceBlockPrimitive).primaryColor}
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    {(p as PriceBlockPrimitive).slots.decimalPart
                      ? `${(p as PriceBlockPrimitive).slots.separator}${(p as PriceBlockPrimitive).slots.decimalPart}`
                      : ''}{' '}
                    {(p as PriceBlockPrimitive).slots.currencySymbol}
                  </text>

                  {/* Strikethrough Reference Price */}
                  {(p as PriceBlockPrimitive).slots.strikethroughPrice && (
                    <g transform={`translate(0, ${p.heightMm * 0.9})`}>
                      <text
                        x="0"
                        y="0"
                        fontSize="2.4mm"
                        fill="#64748b"
                        fontFamily="Plus Jakarta Sans, sans-serif"
                        textDecoration="line-through"
                      >
                        {(p as PriceBlockPrimitive).slots.strikethroughPrice}
                      </text>
                    </g>
                  )}
                </g>
              )}

              {p.type === 'barcode' && (
                <g transform={`translate(${p.xMm}, ${p.yMm})`}>
                  {/* Clean SVG Barcode Lines */}
                  <rect x="0" y="0" width={p.widthMm} height={p.heightMm} fill="#ffffff" />
                  {/* Simulating clear crisp bar patterns */}
                  {Array.from({ length: 42 }).map((_, barIdx) => {
                    const step = (p.widthMm - 4) / 42;
                    const isThick = barIdx % 3 === 0 || barIdx % 7 === 0;
                    return (
                      <rect
                        key={barIdx}
                        x={2 + barIdx * step}
                        y="1"
                        width={isThick ? step * 0.8 : step * 0.45}
                        height={p.heightMm - 4.5}
                        fill={(p as BarcodePrimitive).barColor || '#000000'}
                      />
                    );
                  })}
                  {(p as BarcodePrimitive).showHumanReadable && (
                    <text
                      x={p.widthMm / 2}
                      y={p.heightMm - 0.8}
                      fontSize="2.2mm"
                      fill="#000000"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                    >
                      {(p as BarcodePrimitive).value}
                    </text>
                  )}
                </g>
              )}

              {p.type === 'qr' && (
                <g transform={`translate(${p.xMm}, ${p.yMm})`}>
                  {qrCache[p.id] ? (
                    <image href={qrCache[p.id]} x="0" y="0" width={p.widthMm} height={p.heightMm} />
                  ) : (
                    <rect x="0" y="0" width={p.widthMm} height={p.heightMm} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.2" />
                  )}
                </g>
              )}

              {p.type === 'image' && (
                <image
                  href={(p as any).source}
                  x={p.xMm}
                  y={p.yMm}
                  width={p.widthMm}
                  height={p.heightMm}
                  preserveAspectRatio="xMidYMid meet"
                />
              )}

              {/* Selection Halo */}
              {isHighlighted && (
                <rect
                  x={p.xMm - 0.5}
                  y={p.yMm - 0.5}
                  width={p.widthMm + 1}
                  height={p.heightMm + 1}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="0.5"
                  strokeDasharray="1,1"
                />
              )}
            </g>
          );
        })}

        {/* Optional Printable Boundary Guides */}
        {showGuides && (
          <rect
            x="0"
            y="0"
            width={widthMm}
            height={heightMm}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="0.2"
            strokeDasharray="2,2"
          />
        )}
      </svg>
    </div>
  );
};
