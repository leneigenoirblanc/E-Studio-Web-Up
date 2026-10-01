import {
  LabelTemplate,
  ProductRecord,
  TemplateItem,
  TextItemProperties,
  RichTextItemProperties,
  PriceBlockItemProperties,
  CurvedTextItemProperties,
  PictogramItemProperties,
  BarcodeItemProperties,
  QRCodeItemProperties,
  ShapeItemProperties,
  EllipseItemProperties,
  LineItemProperties,
  TierPriceItemProperties,
  ImageItemProperties,
  RestrictedAreaItemProperties,
  ImpositionCalculation,
  ImpositionConfig,
} from '../types';
import { PricingEngine } from './pricingEngine';
import { TierEngine } from './tierEngine';
import { generateCode128Bars, generateEAN13Bars } from './barcodeGenerator';
import { generateQrMatrix } from './qrGenerator';
import { applyBrandDeduplication } from './dataDrivenTemplateEngine';

export interface HeadlessRenderOptions {
  dpi?: number; // Default 300 for high-res print, 96 for screen
  scalePxPerMm?: number; // If provided, overrides dpi / 25.4
  renderBackground?: boolean;
  renderCutMarks?: boolean;
  renderRestrictedAreas?: boolean;
  renderReferenceImage?: boolean;
  pixelRatio?: number;
}

export class HeadlessCanvasRenderer {
  /**
   * Calculates pixels per mm based on DPI or explicit scale
   */
  public static getPxPerMm(options?: HeadlessRenderOptions): number {
    if (options?.scalePxPerMm) return options.scalePxPerMm;
    const dpi = options?.dpi || 300;
    return dpi / 25.4;
  }

  /**
   * Renders a single label to an HTMLCanvasElement with 1:1 WYSIWYG fidelity
   */
  public static async renderLabelToCanvas(
    template: LabelTemplate,
    record?: ProductRecord,
    options?: HeadlessRenderOptions
  ): Promise<HTMLCanvasElement> {
    const pxPerMm = this.getPxPerMm(options);
    const canvas = document.createElement('canvas');
    const widthPx = Math.max(1, Math.round(template.width_mm * pxPerMm));
    const heightPx = Math.max(1, Math.round(template.height_mm * pxPerMm));

    canvas.width = widthPx;
    canvas.height = heightPx;

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw Template Background
    if (options?.renderBackground !== false) {
      if (template.bg_color && template.bg_color !== 'transparent') {
        ctx.save();
        ctx.globalAlpha = template.bg_opacity ?? 1.0;
        ctx.fillStyle = template.bg_color;
        ctx.fillRect(0, 0, widthPx, heightPx);
        ctx.restore();
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, widthPx, heightPx);
      }
    }

    // 1b. Draw Reference Background Image if visible & requested
    if (
      options?.renderReferenceImage &&
      template.background_image_path &&
      template.background_image_visible
    ) {
      try {
        await this.drawBackgroundImage(
          ctx,
          template.background_image_path,
          widthPx,
          heightPx,
          template.background_image_fit || 'contain',
          template.background_image_opacity ?? 0.35
        );
      } catch {
        // Ignore background image load errors in headless batch
      }
    }

    // 2. Sort items by z_index
    const sortedItems = [...template.items].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

    // 3. Render each item
    for (const item of sortedItems) {
      // Check conditional visibility
      if (record && !PricingEngine.shouldDisplayItem(item, record)) {
        continue;
      }

      await this.renderItem(ctx, item, record, pxPerMm, options);
    }

    return canvas;
  }

  /**
   * Renders a single label and returns a base64 Data URL (PNG)
   */
  public static async renderLabelToDataUrl(
    template: LabelTemplate,
    record?: ProductRecord,
    options?: HeadlessRenderOptions
  ): Promise<string> {
    const canvas = await this.renderLabelToCanvas(template, record, options);
    return canvas.toDataURL('image/png');
  }

  /**
   * Renders a single label and returns a Blob
   */
  public static async renderLabelToBlob(
    template: LabelTemplate,
    record?: ProductRecord,
    options?: HeadlessRenderOptions
  ): Promise<Blob | null> {
    const canvas = await this.renderLabelToCanvas(template, record, options);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  /**
   * Renders an entire Imposition Sheet page to a high-resolution Canvas
   */
  public static async renderImpositionSheetToCanvas(
    template: LabelTemplate,
    products: ProductRecord[],
    imposition: ImpositionCalculation,
    impositionConfig: ImpositionConfig,
    pageIndex = 0,
    options?: HeadlessRenderOptions
  ): Promise<HTMLCanvasElement> {
    const pxPerMm = this.getPxPerMm(options);
    const canvas = document.createElement('canvas');

    const pageWidthPx = Math.max(1, Math.round(imposition.page_w_mm * pxPerMm));
    const pageHeightPx = Math.max(1, Math.round(imposition.page_h_mm * pxPerMm));

    canvas.width = pageWidthPx;
    canvas.height = pageHeightPx;

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // White paper sheet background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, pageWidthPx, pageHeightPx);

    const labelsPerPage = imposition.total_per_page;
    const startOffset = Math.max(0, Math.min(labelsPerPage - 1, impositionConfig.start_offset_slot || 0));
    const gapX = Math.max(0, impositionConfig.gap_x_mm ?? impositionConfig.gap_mm ?? 2.0);
    const gapY = Math.max(0, impositionConfig.gap_y_mm ?? impositionConfig.gap_mm ?? 2.0);

    let productIndex = pageIndex === 0 ? 0 : pageIndex * labelsPerPage - startOffset;

    for (let slot = 0; slot < labelsPerPage; slot++) {
      if (pageIndex === 0 && slot < startOffset) {
        continue; // Skip offset slots on first page
      }

      if (productIndex >= products.length) break;
      const product = products[productIndex];
      productIndex++;

      const col = slot % imposition.cols;
      const row = Math.floor(slot / imposition.cols);

      const labelX_mm = imposition.horizontal_offset_mm + col * (imposition.label_total_w_mm + gapX);
      const labelY_mm = imposition.vertical_offset_mm + row * (imposition.label_total_h_mm + gapY);

      const labelXPx = labelX_mm * pxPerMm;
      const labelYPx = labelY_mm * pxPerMm;
      const labelWPx = template.width_mm * pxPerMm;
      const labelHPx = template.height_mm * pxPerMm;

      // Draw label background and border
      ctx.save();
      ctx.translate(labelXPx, labelYPx);

      if (template.bg_color && template.bg_color !== 'transparent') {
        ctx.fillStyle = template.bg_color;
        ctx.fillRect(0, 0, labelWPx, labelHPx);
      }

      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = Math.max(0.5, 0.15 * pxPerMm);
      ctx.strokeRect(0, 0, labelWPx, labelHPx);

      // Render individual label items
      const sortedItems = [...template.items].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
      for (const item of sortedItems) {
        if (product && !PricingEngine.shouldDisplayItem(item, product)) continue;
        await this.renderItem(ctx, item, product, pxPerMm, options);
      }

      ctx.restore();

      // Render cut marks / registration marks
      if (impositionConfig.show_cut_marks) {
        ctx.save();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = Math.max(0.5, 0.2 * pxPerMm);
        const markLen = 3 * pxPerMm;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(labelXPx - markLen, labelYPx);
        ctx.lineTo(labelXPx, labelYPx);
        ctx.moveTo(labelXPx, labelYPx - markLen);
        ctx.lineTo(labelXPx, labelYPx);
        // Top-right
        ctx.moveTo(labelXPx + labelWPx, labelYPx);
        ctx.lineTo(labelXPx + labelWPx + markLen, labelYPx);
        ctx.moveTo(labelXPx + labelWPx, labelYPx - markLen);
        ctx.lineTo(labelXPx + labelWPx, labelYPx);
        // Bottom-left
        ctx.moveTo(labelXPx - markLen, labelYPx + labelHPx);
        ctx.lineTo(labelXPx, labelYPx + labelHPx);
        ctx.moveTo(labelXPx, labelYPx + labelHPx);
        ctx.lineTo(labelXPx, labelYPx + labelHPx + markLen);
        // Bottom-right
        ctx.moveTo(labelXPx + labelWPx, labelYPx + labelHPx);
        ctx.lineTo(labelXPx + labelWPx + markLen, labelYPx + labelHPx);
        ctx.moveTo(labelXPx + labelWPx, labelYPx + labelHPx);
        ctx.lineTo(labelXPx + labelWPx, labelYPx + labelHPx + markLen);
        ctx.stroke();

        ctx.restore();
      }
    }

    return canvas;
  }

  /**
   * Internal dispatcher for rendering a single template item
   */
  private static async renderItem(
    ctx: CanvasRenderingContext2D,
    item: TemplateItem,
    record?: ProductRecord,
    pxPerMm = 3.78,
    options?: HeadlessRenderOptions
  ) {
    const x = item.x_mm * pxPerMm;
    const y = item.y_mm * pxPerMm;
    const w = item.w_mm * pxPerMm;
    const h = item.h_mm * pxPerMm;

    ctx.save();

    // Handle rotation around center
    const rotationDeg = (item as any).rotation_angle ?? (item as any).rotation_deg ?? item.rotation ?? 0;
    if (rotationDeg !== 0) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotationDeg * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    // Handle opacity
    const opacity = (item as any).opacity !== undefined ? (item as any).opacity : 1.0;
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

    switch (item.type) {
      case 'text':
        this.renderTextItem(ctx, item as TextItemProperties, record, x, y, w, h, pxPerMm);
        break;
      case 'rich_text':
        this.renderRichTextItem(ctx, item as RichTextItemProperties, record, x, y, w, h, pxPerMm);
        break;
      case 'price_block':
        this.renderPriceBlockItem(ctx, item as PriceBlockItemProperties, record, x, y, w, h, pxPerMm);
        break;
      case 'curved_text':
        this.renderCurvedTextItem(ctx, item as CurvedTextItemProperties, x, y, w, h, pxPerMm);
        break;
      case 'pictogram':
        this.renderPictogramItem(ctx, item as PictogramItemProperties, x, y, w, h, pxPerMm);
        break;
      case 'shape':
        this.renderShapeItem(ctx, item as ShapeItemProperties, x, y, w, h, pxPerMm);
        break;
      case 'ellipse':
        this.renderEllipseItem(ctx, item as EllipseItemProperties, x, y, w, h, pxPerMm);
        break;
      case 'line':
        this.renderLineItem(ctx, item as LineItemProperties, x, y, w, h, pxPerMm);
        break;
      case 'barcode':
        this.renderBarcodeItem(ctx, item as BarcodeItemProperties, record, x, y, w, h, pxPerMm);
        break;
      case 'qrcode':
        this.renderQrCodeItem(ctx, item as QRCodeItemProperties, record, x, y, w, h, pxPerMm);
        break;
      case 'tier_price':
        this.renderTierPriceItem(ctx, item as TierPriceItemProperties, record, x, y, w, h, pxPerMm);
        break;
      case 'image':
        await this.renderImageItem(ctx, item as ImageItemProperties, record, x, y, w, h, pxPerMm);
        break;
      case 'restricted_area':
        if (options?.renderRestrictedAreas) {
          this.renderRestrictedAreaItem(ctx, item as RestrictedAreaItemProperties, x, y, w, h, pxPerMm);
        }
        break;
    }

    ctx.restore();
  }

  /**
   * 1. TEXT ITEM RENDERING (1:1 PARITY WITH LabelRenderer.tsx)
   */
  private static renderTextItem(
    ctx: CanvasRenderingContext2D,
    item: TextItemProperties,
    record: ProductRecord | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    pxPerMm: number
  ) {
    let displayVal = PricingEngine.resolveCalculatedText(item, record);
    let mainText = displayVal || item.placeholder || '';

    if (record && record.BRAND_INFO && (item.binding_key === 'ITEMNAME' || item.binding_key === 'ITEMDESCRIPTION')) {
      mainText = applyBrandDeduplication(mainText, record.BRAND_INFO, true);
    }
    if (item.prefix_text) mainText = `${item.prefix_text} ${mainText}`;
    if (item.suffix_text) mainText = `${mainText} ${item.suffix_text}`;
    mainText = PricingEngine.injectNonBreakingSpaces(mainText);

    if (item.text_transform === 'uppercase') mainText = mainText.toUpperCase();
    else if (item.text_transform === 'lowercase') mainText = mainText.toLowerCase();
    else if (item.text_transform === 'capitalize') {
      mainText = mainText.replace(/\b\w/g, (c) => c.toUpperCase());
    }

    const scaleFactor = pxPerMm / 3.78;

    // Fill background & border if set
    if (item.fill_color && item.fill_color !== 'transparent') {
      ctx.fillStyle = item.fill_color;
      if (item.corner_radius && item.corner_radius > 0) {
        this.roundRect(ctx, x, y, w, h, item.corner_radius * pxPerMm);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, w, h);
      }
    }

    if (item.border_width && item.border_width > 0 && item.border_color) {
      ctx.strokeStyle = item.border_color;
      ctx.lineWidth = item.border_width * scaleFactor;
      if (item.corner_radius && item.corner_radius > 0) {
        this.roundRect(ctx, x, y, w, h, item.corner_radius * pxPerMm);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, w, h);
      }
    }

    const isPriceField =
      item.is_price ||
      item.binding_key === 'SELLING_PRICE' ||
      item.binding_key === 'PROMOPRICE' ||
      (item.binding_key && item.binding_key.toLowerCase().includes('price')) ||
      (item.binding_key && item.binding_key.toLowerCase().includes('prix'));

    const hasCurrency = Boolean((isPriceField || item.currency_symbol) && item.currency_symbol);
    if (!mainText && !hasCurrency) return;

    // Font metrics
    const baseFontSizePx = Math.max(6, item.font_size_pt * 1.333 * scaleFactor);
    const fontFamily = item.font_family || 'Plus Jakarta Sans, sans-serif';
    const fontWeight = item.font_weight || 'normal';
    const fontStyle = item.font_style || 'normal';

    let fontSizePx = baseFontSizePx;
    const isSub = item.subscript_superscript === 'subscript';
    const isSuper = item.subscript_superscript === 'superscript';
    if (isSub || isSuper) {
      fontSizePx = Math.max(5, fontSizePx * 0.75);
    }

    // Auto shrink calculation
    const lineHeightMultiplier = item.line_height_multiplier || 1.25;
    const approxCharWidth = fontSizePx * 0.52;
    const availableBoxWidth = Math.max(16, w - 4 * scaleFactor);
    const approxLines = Math.max(1, Math.ceil((mainText.length * approxCharWidth) / availableBoxWidth));
    const estTextHeight = approxLines * (fontSizePx * lineHeightMultiplier);

    if (estTextHeight > h && h > 8 * scaleFactor && item.overflow !== 'clip') {
      const autoShrink = Math.max(0.65, (h - 2 * scaleFactor) / estTextHeight);
      fontSizePx = Math.max(5 * scaleFactor, Math.round(fontSizePx * autoShrink));
    }

    ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
    ctx.fillStyle = item.text_color || '#000000';

    // Text Shadow
    if (item.text_shadow && item.text_shadow.enabled) {
      ctx.shadowColor = item.text_shadow.color || '#000000';
      ctx.shadowOffsetX = (item.text_shadow.offset_x_px || 1) * scaleFactor;
      ctx.shadowOffsetY = (item.text_shadow.offset_y_px || 1) * scaleFactor;
      ctx.shadowBlur = (item.text_shadow.blur_px || 2) * scaleFactor;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 0;
    }

    // Word wrap lines
    const words = mainText.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > availableBoxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    if (lines.length === 0) lines.push('');

    const lineHeight = fontSizePx * lineHeightMultiplier;
    const totalBlockHeight = lines.length * lineHeight;

    // Vertical align
    let startY = y + fontSizePx;
    if (item.valign === 'middle') {
      startY = y + (h - totalBlockHeight) / 2 + fontSizePx * 0.85;
    } else if (item.valign === 'bottom') {
      startY = y + h - totalBlockHeight + fontSizePx * 0.85;
    }

    // Currency attributes
    const currencySym = item.currency_symbol || 'FCFA';
    const currFontSizePx = item.currency_font_size_pt
      ? Math.max(5, item.currency_font_size_pt * 1.333 * scaleFactor)
      : Math.max(5, fontSizePx * 0.6);
    const currFontFamily = item.currency_font_family || item.font_family || 'Plus Jakarta Sans, sans-serif';
    const currFontWeight = item.currency_font_weight || item.font_weight || 'bold';
    const currFontStyle = item.currency_font_style || 'normal';
    const currColor = item.currency_color || item.text_color || '#000000';
    const currPosition = item.currency_position || 'after';

    // Render lines
    lines.forEach((line, index) => {
      let lineY = startY + index * lineHeight;
      if (isSub) lineY += fontSizePx * 0.15;
      else if (isSuper) lineY -= fontSizePx * 0.2;

      const isLastLine = index === lines.length - 1;
      const isFirstLine = index === 0;

      ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
      let lineWidth = ctx.measureText(line).width;

      let lineX = x + 2 * scaleFactor;
      if (item.alignment === 'center') {
        lineX = x + (w - lineWidth) / 2;
      } else if (item.alignment === 'right') {
        lineX = x + w - lineWidth - 2 * scaleFactor;
      }

      // Currency Before
      if (hasCurrency && currPosition === 'before' && isFirstLine) {
        ctx.save();
        ctx.font = `${currFontStyle} ${currFontWeight} ${currFontSizePx}px ${currFontFamily}`;
        ctx.fillStyle = currColor;
        const currWidth = ctx.measureText(currencySym).width;
        ctx.fillText(currencySym, lineX - currWidth - 3 * scaleFactor, lineY);
        ctx.restore();
      }

      // Highlight Background
      if (item.highlight_color && item.highlight_color !== 'transparent') {
        ctx.save();
        ctx.fillStyle = item.highlight_color;
        ctx.fillRect(lineX - 2 * scaleFactor, lineY - fontSizePx * 0.85, lineWidth + 4 * scaleFactor, fontSizePx * 1.05);
        ctx.restore();
      }

      // Strikethrough or underline
      if (item.text_decoration && item.text_decoration.includes('line-through')) {
        ctx.save();
        ctx.strokeStyle = item.strikethrough_color || item.text_color || '#000000';
        ctx.lineWidth = Math.max(1, fontSizePx * 0.08);
        const strikethroughY = lineY - fontSizePx * 0.3;
        ctx.beginPath();
        ctx.moveTo(lineX, strikethroughY);
        ctx.lineTo(lineX + lineWidth, strikethroughY);
        ctx.stroke();
        ctx.restore();
      }

      if (item.text_decoration && item.text_decoration.includes('underline')) {
        ctx.save();
        ctx.strokeStyle = item.text_color || '#000000';
        ctx.lineWidth = Math.max(1, fontSizePx * 0.06);
        const underlineY = lineY + 2 * scaleFactor;
        ctx.beginPath();
        ctx.moveTo(lineX, underlineY);
        ctx.lineTo(lineX + lineWidth, underlineY);
        ctx.stroke();
        ctx.restore();
      }

      // Main line text
      ctx.font = `${fontStyle} ${fontWeight} ${fontSizePx}px ${fontFamily}`;
      ctx.fillStyle = item.text_color || '#000000';
      ctx.fillText(line, lineX, lineY);

      // Currency After / Superscript / Subscript
      if (hasCurrency && currPosition !== 'before' && isLastLine) {
        ctx.save();
        ctx.font = `${currFontStyle} ${currFontWeight} ${currFontSizePx}px ${currFontFamily}`;
        ctx.fillStyle = currColor;
        let currY = lineY;
        if (currPosition === 'superscript') currY = lineY - fontSizePx * 0.25;
        else if (currPosition === 'subscript') currY = lineY + fontSizePx * 0.15;
        ctx.fillText(` ${currencySym}`, lineX + lineWidth, currY);
        ctx.restore();
      }
    });

    ctx.shadowColor = 'transparent';
  }

  /**
   * 2. RICH TEXT ITEM RENDERING
   */
  private static renderRichTextItem(
    ctx: CanvasRenderingContext2D,
    item: RichTextItemProperties,
    record: ProductRecord | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    pxPerMm: number
  ) {
    const scaleFactor = pxPerMm / 3.78;
    const defaultFontSize = Math.max(6, (item.default_font_size_pt || 11) * 1.333 * scaleFactor);
    const runs = Array.isArray(item.runs) ? item.runs : [];

    let totalWidth = 0;
    const evaluatedRuns = runs.map((run) => {
      let runText = run.text || '';
      if (run.binding_key && record) {
        const val = PricingEngine.getProductFieldValue(record, run.binding_key);
        runText = val !== undefined && val !== null ? String(val) : '';
      }
      runText = PricingEngine.injectNonBreakingSpaces(runText);
      const runFontSize = Math.max(5, (run.font_size_pt || item.default_font_size_pt || 11) * 1.333 * scaleFactor);
      const isSuper = run.baseline_shift === 'superscript';
      const isSub = run.baseline_shift === 'subscript';
      const effectiveSize = isSuper || isSub ? runFontSize * 0.75 : runFontSize;
      const runFontFamily = item.font_family || 'Plus Jakarta Sans, sans-serif';
      const runWeight = run.font_weight || 'normal';
      const runStyle = run.font_style || 'normal';

      ctx.font = `${runStyle} ${runWeight} ${effectiveSize}px ${runFontFamily}`;
      const width = ctx.measureText(runText).width;
      totalWidth += width;

      return {
        ...run,
        runText,
        effectiveSize,
        runFontFamily,
        runWeight,
        runStyle,
        width,
        isSuper,
        isSub,
      };
    });

    let currentX = x + 2 * scaleFactor;
    if (item.alignment === 'center') {
      currentX = x + Math.max(0, (w - totalWidth) / 2);
    } else if (item.alignment === 'right') {
      currentX = x + Math.max(0, w - totalWidth - 4 * scaleFactor);
    }

    let startY = y + defaultFontSize * 1.1;
    if (item.valign === 'middle') {
      startY = y + (h + defaultFontSize * 0.7) / 2;
    } else if (item.valign === 'bottom') {
      startY = y + h - 2 * scaleFactor;
    }

    for (const r of evaluatedRuns) {
      if (!r.runText) continue;

      ctx.font = `${r.runStyle} ${r.runWeight} ${r.effectiveSize}px ${r.runFontFamily}`;

      if (r.highlight_color && r.highlight_color !== 'transparent') {
        ctx.save();
        ctx.fillStyle = r.highlight_color;
        ctx.fillRect(currentX, startY - r.effectiveSize * 0.85, r.width, r.effectiveSize * 1.05);
        ctx.restore();
      }

      let drawY = startY;
      if (r.isSuper) drawY = startY - r.effectiveSize * 0.35;
      else if (r.isSub) drawY = startY + r.effectiveSize * 0.2;

      ctx.fillStyle = r.text_color || item.default_text_color || '#000000';
      ctx.fillText(r.runText, currentX, drawY);

      if (r.text_decoration && r.text_decoration.includes('line-through')) {
        ctx.save();
        ctx.strokeStyle = r.text_color || item.default_text_color || '#000000';
        ctx.lineWidth = Math.max(1, r.effectiveSize * 0.08);
        ctx.beginPath();
        ctx.moveTo(currentX, drawY - r.effectiveSize * 0.3);
        ctx.lineTo(currentX + r.width, drawY - r.effectiveSize * 0.3);
        ctx.stroke();
        ctx.restore();
      }

      currentX += r.width;
    }
  }

  /**
   * 3. PRICE BLOCK ITEM RENDERING (1:1 WYSIWYG AUTO-SCALING)
   */
  private static renderPriceBlockItem(
    ctx: CanvasRenderingContext2D,
    item: PriceBlockItemProperties,
    record: ProductRecord | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    pxPerMm: number
  ) {
    const scaleFactor = pxPerMm / 3.78;
    let rawPrice: any = item.fallback_price ?? 29.99;

    if (item.binding_key && record) {
      const val = PricingEngine.getProductFieldValue(record, item.binding_key);
      if (val !== undefined && val !== null && val !== '') {
        rawPrice = val;
      }
    }

    const separator = item.decimal_separator || ',';
    const { integerPart, decimalPart } = PricingEngine.splitPrice(rawPrice, separator);

    const intSizePt = item.integer_style?.font_size_pt || 28;
    const decSizePt = item.decimal_style?.font_size_pt || Math.max(9, Math.round(intSizePt * 0.52));
    const currSizePt = item.currency_style?.font_size_pt || Math.max(9, Math.round(intSizePt * 0.48));

    const baseIntSizePx = Math.max(10, intSizePt * 1.333 * scaleFactor);
    const baseDecSizePx = Math.max(7, decSizePt * 1.333 * scaleFactor);
    const baseCurrSizePx = Math.max(7, currSizePt * 1.333 * scaleFactor);

    const currencySym = item.currency_symbol || '€';
    const currPos = item.currency_position || 'after';
    const decShift = item.decimal_style?.baseline_shift || 'superscript';

    // Auto-scale calculation matching LabelRenderer.tsx
    const estIntWidth = String(integerPart).length * (baseIntSizePx * 0.6);
    const estDecWidth = decimalPart ? String(decimalPart).length * (baseDecSizePx * 0.6) + 6 * scaleFactor : 0;
    const estCurrWidth = currencySym ? baseCurrSizePx * 0.7 * currencySym.length + 6 * scaleFactor : 0;
    const totalEstPriceWidth = estIntWidth + estDecWidth + estCurrWidth;
    const availableW = Math.max(16, w - 4 * scaleFactor);

    const priceScale = totalEstPriceWidth > availableW ? Math.max(0.55, availableW / totalEstPriceWidth) : 1;
    const intSizePx = Math.max(8, Math.round(baseIntSizePx * priceScale));
    const decSizePx = Math.max(6, Math.round(baseDecSizePx * priceScale));
    const currSizePx = Math.max(6, Math.round(baseCurrSizePx * priceScale));

    const fontFamily = item.font_family || 'Plus Jakarta Sans, sans-serif';
    const integerWeight = item.integer_style?.font_weight || '800';
    const integerColor = item.integer_style?.text_color || '#000000';
    const decimalColor = item.decimal_style?.text_color || integerColor;
    const currencyColor = item.currency_style?.text_color || integerColor;

    // Actual width measurement
    ctx.font = `normal ${integerWeight} ${intSizePx}px ${fontFamily}`;
    const wholeWidth = ctx.measureText(String(integerPart)).width;

    ctx.font = `normal ${item.decimal_style?.font_weight || '700'} ${decSizePx}px ${fontFamily}`;
    const decimalWidth = decimalPart ? ctx.measureText(`${separator}${decimalPart}`).width : 0;

    ctx.font = `normal ${item.currency_style?.font_weight || '600'} ${currSizePx}px ${fontFamily}`;
    const currencyWidth = currencySym ? ctx.measureText(currPos === 'before' ? `${currencySym} ` : ` ${currencySym}`).width : 0;

    const totalContentWidth = wholeWidth + decimalWidth + currencyWidth;

    let startX = x + 2 * scaleFactor;
    if (item.alignment === 'center') {
      startX = x + (w - totalContentWidth) / 2;
    } else if (item.alignment === 'right') {
      startX = x + w - totalContentWidth - 2 * scaleFactor;
    }

    let baseLineY = y + h * 0.78;
    if (item.valign === 'middle') {
      baseLineY = y + (h + intSizePx * 0.7) / 2;
    } else if (item.valign === 'bottom') {
      baseLineY = y + h - 2 * scaleFactor;
    }

    let currX = startX;

    // 1. Currency Before
    if (currencySym && currPos === 'before') {
      ctx.fillStyle = currencyColor;
      ctx.font = `normal ${item.currency_style?.font_weight || '600'} ${currSizePx}px ${fontFamily}`;
      ctx.fillText(currencySym, currX, baseLineY);
      currX += currencyWidth;
    }

    // 2. Whole integer part
    ctx.fillStyle = integerColor;
    ctx.font = `normal ${integerWeight} ${intSizePx}px ${fontFamily}`;
    ctx.fillText(String(integerPart), currX, baseLineY);
    currX += wholeWidth;

    // 3. Decimal Part
    if (decimalPart) {
      ctx.fillStyle = decimalColor;
      ctx.font = `normal ${item.decimal_style?.font_weight || '700'} ${decSizePx}px ${fontFamily}`;
      const decY = decShift === 'superscript' ? baseLineY - intSizePx * 0.35 : baseLineY;
      ctx.fillText(`${separator}${decimalPart}`, currX, decY);
      currX += decimalWidth;
    }

    // 4. Currency After / Superscript
    if (currencySym && (currPos === 'after' || currPos === 'superscript')) {
      ctx.fillStyle = currencyColor;
      ctx.font = `normal ${item.currency_style?.font_weight || '600'} ${currSizePx}px ${fontFamily}`;
      const isSuper = currPos === 'superscript' || item.currency_style?.baseline_shift === 'superscript';
      const currY = isSuper ? baseLineY - intSizePx * 0.35 : baseLineY;
      ctx.fillText(` ${currencySym}`, currX, currY);
    }
  }

  /**
   * 4. CURVED TEXT ITEM RENDERING
   */
  private static renderCurvedTextItem(
    ctx: CanvasRenderingContext2D,
    item: CurvedTextItemProperties,
    x: number,
    y: number,
    w: number,
    h: number,
    pxPerMm: number
  ) {
    const scaleFactor = pxPerMm / 3.78;
    const text = item.text || 'Texte Courbé';
    const cx = x + w / 2;
    const cy = y + h / 2;
    const radius = Math.min(w, h) * 0.42;

    const fontSizePx = Math.max(6, item.font_size_pt * 1.333 * scaleFactor);
    const fontFamily = item.font_family || 'Plus Jakarta Sans, sans-serif';
    const fontWeight = item.font_weight || 'bold';

    ctx.font = `normal ${fontWeight} ${fontSizePx}px ${fontFamily}`;
    ctx.fillStyle = item.text_color || '#000000';

    const startAngleRad = ((item.start_angle_deg || 0) * Math.PI) / 180;
    const sweepAngleRad = ((item.sweep_angle_deg || 180) * Math.PI) / 180;
    const clockwise = item.clockwise !== false;

    const chars = text.split('');
    const angleStep = sweepAngleRad / Math.max(1, chars.length - 1);

    chars.forEach((char, index) => {
      const angle = startAngleRad + (clockwise ? index * angleStep : -index * angleStep);
      const charX = cx + radius * Math.cos(angle);
      const charY = cy + radius * Math.sin(angle);

      ctx.save();
      ctx.translate(charX, charY);
      ctx.rotate(angle + Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
  }

  /**
   * 5. PICTOGRAM ITEM RENDERING
   */
  private static renderPictogramItem(
    ctx: CanvasRenderingContext2D,
    item: PictogramItemProperties,
    x: number,
    y: number,
    w: number,
    h: number,
    pxPerMm: number
  ) {
    const type = item.pictogram_type || 'bio_ab';
    const scaleFactor = pxPerMm / 3.78;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);

    if (type.startsWith('nutriscore_')) {
      const activeLetter = type.replace('nutriscore_', '').toUpperCase();
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const colors = ['#038141', '#85bb2f', '#fecb02', '#ee8100', '#e63e11'];

      ctx.fillStyle = '#1E293B';
      ctx.font = `900 ${Math.max(6, Math.round(h * 0.16))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('NUTRI-SCORE', x + w / 2, y + h * 0.22);

      const boxW = (w - 8 * scaleFactor) / 5;
      const boxY = y + h * 0.32;
      const boxH = h * 0.6;

      letters.forEach((l, i) => {
        const isActive = l === activeLetter;
        const curX = x + 4 * scaleFactor + i * boxW;
        ctx.fillStyle = colors[i];
        if (isActive) {
          ctx.fillRect(curX, boxY - 2 * scaleFactor, boxW, boxH + 4 * scaleFactor);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `900 ${Math.max(8, Math.round(boxH * 0.65))}px sans-serif`;
          ctx.fillText(l, curX + boxW / 2, boxY + boxH * 0.65);
        } else {
          ctx.globalAlpha = 0.65;
          ctx.fillRect(curX, boxY, boxW, boxH);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `700 ${Math.max(6, Math.round(boxH * 0.45))}px sans-serif`;
          ctx.fillText(l, curX + boxW / 2, boxY + boxH * 0.65);
          ctx.globalAlpha = 1.0;
        }
      });
    } else if (type.startsWith('ecoscore_')) {
      const activeLetter = type.replace('ecoscore_', '').toUpperCase();
      const letters = ['A', 'B', 'C', 'D', 'E'];
      const colors = ['#1e824c', '#2ecc71', '#f39c12', '#e67e22', '#d35400'];

      ctx.fillStyle = '#065F46';
      ctx.font = `900 ${Math.max(6, Math.round(h * 0.16))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ÉCO-SCORE', x + w / 2, y + h * 0.22);

      const boxW = (w - 8 * scaleFactor) / 5;
      const boxY = y + h * 0.32;
      const boxH = h * 0.6;

      letters.forEach((l, i) => {
        const isActive = l === activeLetter;
        const curX = x + 4 * scaleFactor + i * boxW;
        ctx.fillStyle = colors[i];
        if (isActive) {
          ctx.fillRect(curX, boxY - 2 * scaleFactor, boxW, boxH + 4 * scaleFactor);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `900 ${Math.max(8, Math.round(boxH * 0.65))}px sans-serif`;
          ctx.fillText(l, curX + boxW / 2, boxY + boxH * 0.65);
        } else {
          ctx.globalAlpha = 0.65;
          ctx.fillRect(curX, boxY, boxW, boxH);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `700 ${Math.max(6, Math.round(boxH * 0.45))}px sans-serif`;
          ctx.fillText(l, curX + boxW / 2, boxY + boxH * 0.65);
          ctx.globalAlpha = 1.0;
        }
      });
    } else if (type === 'origin_france' || type === 'origin_local') {
      const isFrance = type === 'origin_france';
      const flagW = Math.min(w * 0.35, h * 0.8);
      const flagH = h * 0.75;
      const flagX = x + 4 * scaleFactor;
      const flagY = y + (h - flagH) / 2;

      ctx.fillStyle = '#002395';
      ctx.fillRect(flagX, flagY, flagW / 3, flagH);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(flagX + flagW / 3, flagY, flagW / 3, flagH);
      ctx.fillStyle = '#ED2939';
      ctx.fillRect(flagX + (2 * flagW) / 3, flagY, flagW / 3, flagH);

      ctx.fillStyle = '#64748B';
      ctx.font = `bold ${Math.max(5, Math.round(h * 0.22))}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('ORIGINE', flagX + flagW + 4 * scaleFactor, y + h * 0.42);

      ctx.fillStyle = '#0F172A';
      ctx.font = `900 ${Math.max(7, Math.round(h * 0.32))}px sans-serif`;
      ctx.fillText(isFrance ? 'FRANCE' : 'LOCALE', flagX + flagW + 4 * scaleFactor, y + h * 0.75);
    } else {
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.38, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 ${Math.max(7, Math.round(h * 0.28))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(type.substring(0, 4).toUpperCase(), x + w / 2, y + h * 0.58);
    }
  }

  /**
   * 6. SHAPE ITEM RENDERING
   */
  private static renderShapeItem(
    ctx: CanvasRenderingContext2D,
    item: ShapeItemProperties,
    x: number,
    y: number,
    w: number,
    h: number,
    pxPerMm: number
  ) {
    const scaleFactor = pxPerMm / 3.78;

    if (item.fill_color && item.fill_color !== 'transparent') {
      ctx.fillStyle = item.fill_color;
      if (item.corner_radius && item.corner_radius > 0) {
        this.roundRect(ctx, x, y, w, h, item.corner_radius * pxPerMm);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, w, h);
      }
    }

    if (item.border_width && item.border_width > 0 && item.border_color) {
      ctx.strokeStyle = item.border_color;
      ctx.lineWidth = item.border_width * scaleFactor;
      if (item.corner_radius && item.corner_radius > 0) {
        this.roundRect(ctx, x, y, w, h, item.corner_radius * pxPerMm);
        ctx.stroke();
      } else {
        ctx.strokeRect(x, y, w, h);
      }
    }
  }

  /**
   * 6b. ELLIPSE ITEM RENDERING
   */
  private static renderEllipseItem(
    ctx: CanvasRenderingContext2D,
    item: EllipseItemProperties,
    x: number,
    y: number,
    w: number,
    h: number,
    pxPerMm: number
  ) {
    const scaleFactor = pxPerMm / 3.78;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);

    if (item.fill_color && item.fill_color !== 'transparent') {
      ctx.fillStyle = item.fill_color;
      ctx.fill();
    }
    if (item.border_width && item.border_width > 0 && item.border_color) {
      ctx.strokeStyle = item.border_color;
      ctx.lineWidth = item.border_width * scaleFactor;
      ctx.stroke();
    }
  }

  /**
   * 6c. LINE ITEM RENDERING
   */
  private static renderLineItem(
    ctx: CanvasRenderingContext2D,
    item: LineItemProperties,
    x: number,
    y: number,
    w: number,
    h: number,
    pxPerMm: number
  ) {
    const scaleFactor = pxPerMm / 3.78;
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + w, y + h / 2);

    ctx.strokeStyle = item.color || '#000000';
    ctx.lineWidth = (item.thickness || 1) * scaleFactor;

    if (item.style === 'dashed') {
      ctx.setLineDash([4 * scaleFactor, 4 * scaleFactor]);
    } else if (item.style === 'dotted') {
      ctx.setLineDash([2 * scaleFactor, 2 * scaleFactor]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.stroke();
  }

  /**
   * 7. BARCODE ITEM RENDERING
   */
  private static renderBarcodeItem(
    ctx: CanvasRenderingContext2D,
    item: BarcodeItemProperties,
    record: ProductRecord | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    pxPerMm: number
  ) {
    const scaleFactor = pxPerMm / 3.78;
    const codeValue = PricingEngine.resolveBarcodeValue(item, record);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);

    const bType = item.barcode_type || 'ean13';
    let bars: boolean[] = [];
    let formattedCode = codeValue;

    if (bType === 'ean13') {
      try {
        const res = generateEAN13Bars(codeValue);
        bars = res.bars;
        formattedCode = res.formattedCode;
      } catch {
        bars = generateCode128Bars(codeValue);
      }
    } else {
      bars = generateCode128Bars(codeValue);
    }

    if (bars.length === 0) return;

    const showText = item.show_text !== false;
    const textHeight = showText ? Math.max(8 * scaleFactor, h * 0.22) : 0;
    const barHeight = Math.max(4, h - textHeight - 2 * scaleFactor);

    const barWidth = (w - 4 * scaleFactor) / bars.length;
    ctx.fillStyle = item.bar_color || '#000000';

    for (let i = 0; i < bars.length; i++) {
      if (bars[i]) {
        ctx.fillRect(x + 2 * scaleFactor + i * barWidth, y + 1 * scaleFactor, Math.max(1, barWidth), barHeight);
      }
    }

    if (showText) {
      ctx.font = `600 ${Math.max(6, textHeight * 0.85)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(formattedCode, x + w / 2, y + h - 1 * scaleFactor);
    }
  }

  /**
   * 8. QR CODE ITEM RENDERING
   */
  private static renderQrCodeItem(
    ctx: CanvasRenderingContext2D,
    item: QRCodeItemProperties,
    record: ProductRecord | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    _pxPerMm: number
  ) {
    const qrValue = PricingEngine.resolveQrContent(item, record);
    const matrix = generateQrMatrix(qrValue);
    const size = matrix.length;
    if (size === 0) return;

    const cellSize = Math.min(w, h) / size;
    const offsetX = x + (w - size * cellSize) / 2;
    const offsetY = y + (h - size * cellSize) / 2;

    ctx.fillStyle = item.background_color || '#FFFFFF';
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = item.module_color || '#000000';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(offsetX + c * cellSize, offsetY + r * cellSize, cellSize + 0.5, cellSize + 0.5);
        }
      }
    }
  }

  /**
   * 9. TIER PRICING ITEM RENDERING
   */
  private static renderTierPriceItem(
    ctx: CanvasRenderingContext2D,
    item: TierPriceItemProperties,
    record: ProductRecord | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    pxPerMm: number
  ) {
    const scaleFactor = pxPerMm / 3.78;
    const resolved = TierEngine.resolve(
      {
        primary_index: Math.max(0, (item.primary_tier || 1) - 1),
        keyword_prefix: item.prefix_text,
        unit_label: item.unit_label,
        strict_required: item.strict_required,
        fallback_to_base_price: item.fallback_to_base_price ?? true,
        pricing_strategy: item.pricing_strategy,
        cross_conditional: item.cross_conditional,
      },
      record
    );

    const isError = resolved?.error;
    const isFallback = resolved?.is_fallback;
    const strategy = resolved?.strategy || item.pricing_strategy || 'flat';

    const defaultBg = isError ? '#FEF2F2' : isFallback ? '#FFFBEB' : '#F0F9FF';
    const defaultBorder = isError ? '#FCA5A5' : isFallback ? '#FCD34D' : '#BAE6FD';
    const defaultText = isError ? '#991B1B' : isFallback ? '#78350F' : '#082F49';

    ctx.fillStyle = item.fill_color || defaultBg;
    if (item.corner_radius) {
      this.roundRect(ctx, x, y, w, h, item.corner_radius * pxPerMm);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, w, h);
    }

    ctx.strokeStyle = item.border_color || defaultBorder;
    ctx.lineWidth = Math.max(1, (item.border_width || 1) * scaleFactor);
    if (item.corner_radius) {
      this.roundRect(ctx, x, y, w, h, item.corner_radius * pxPerMm);
      ctx.stroke();
    } else {
      ctx.strokeRect(x, y, w, h);
    }

    const fontSizePx = Math.max(6, (item.font_size_pt || 9) * 1.333 * scaleFactor);
    ctx.fillStyle = item.text_color || defaultText;
    ctx.font = `bold ${fontSizePx}px ${item.font_family || 'Plus Jakarta Sans, sans-serif'}`;
    ctx.textAlign = 'left';

    let tierLabel = 'PALIERS DE PRIX';
    if (resolved) {
      tierLabel = isError ? resolved.text_qty : `${resolved.text_qty} : ${resolved.formatted_price}${isFallback ? ' (base)' : ''}`;
    }

    const textX = x + 4 * scaleFactor;
    const textY = y + (h + fontSizePx * 0.7) / 2;
    ctx.fillText(tierLabel, textX, textY);

    // Strategy tag
    const tagText = strategy === 'graduated' ? 'CUMULATIF' : 'VOLUME';
    const tagFontSize = Math.max(5, fontSizePx * 0.75);
    ctx.font = `bold ${tagFontSize}px sans-serif`;
    const tagWidth = ctx.measureText(tagText).width + 6 * scaleFactor;
    const tagX = x + w - tagWidth - 4 * scaleFactor;
    const tagH = tagFontSize * 1.4;
    const tagY = y + (h - tagH) / 2;

    ctx.fillStyle = strategy === 'graduated' ? '#E0E7FF' : '#E0F2FE';
    this.roundRect(ctx, tagX, tagY, tagWidth, tagH, 2 * scaleFactor);
    ctx.fill();

    ctx.fillStyle = strategy === 'graduated' ? '#4338CA' : '#0369A1';
    ctx.textAlign = 'center';
    ctx.fillText(tagText, tagX + tagWidth / 2, tagY + tagH * 0.75);
  }

  /**
   * 10. IMAGE ITEM RENDERING
   */
  private static async renderImageItem(
    ctx: CanvasRenderingContext2D,
    item: ImageItemProperties,
    record: ProductRecord | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    _pxPerMm: number
  ) {
    let src = item.source || '';
    if (item.binding_key && record) {
      const bound = PricingEngine.getProductFieldValue(record, item.binding_key);
      if (typeof bound === 'string') src = bound;
    }

    if (!src) return;

    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (item.keep_aspect_ratio) {
          const imgAspect = img.width / img.height;
          const boxAspect = w / h;
          let drawW = w;
          let drawH = h;
          let drawX = x;
          let drawY = y;

          if (imgAspect > boxAspect) {
            drawH = w / imgAspect;
            drawY = y + (h - drawH) / 2;
          } else {
            drawW = h * imgAspect;
            drawX = x + (w - drawW) / 2;
          }
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
        } else {
          ctx.drawImage(img, x, y, w, h);
        }
        resolve();
      };
      img.onerror = () => resolve();
      img.src = src;
    });
  }

  /**
   * 11. RESTRICTED AREA ITEM RENDERING
   */
  private static renderRestrictedAreaItem(
    ctx: CanvasRenderingContext2D,
    item: RestrictedAreaItemProperties,
    x: number,
    y: number,
    w: number,
    h: number,
    pxPerMm: number
  ) {
    const scaleFactor = pxPerMm / 3.78;
    ctx.fillStyle = item.zone_color ? `${item.zone_color}22` : 'rgba(239, 68, 68, 0.15)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = item.zone_color || '#EF4444';
    ctx.lineWidth = scaleFactor;
    ctx.setLineDash([4 * scaleFactor, 4 * scaleFactor]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
  }

  /**
   * Helper to draw background reference image
   */
  private static async drawBackgroundImage(
    ctx: CanvasRenderingContext2D,
    src: string,
    widthPx: number,
    heightPx: number,
    fit: 'contain' | 'fill' | 'stretch' | 'cover',
    opacity: number
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.save();
        ctx.globalAlpha = opacity;
        if (fit === 'fill' || fit === 'stretch') {
          ctx.drawImage(img, 0, 0, widthPx, heightPx);
        } else {
          const imgAspect = img.width / img.height;
          const boxAspect = widthPx / heightPx;
          let drawW = widthPx;
          let drawH = heightPx;
          let drawX = 0;
          let drawY = 0;

          if (imgAspect > boxAspect) {
            drawH = widthPx / imgAspect;
            drawY = (heightPx - drawH) / 2;
          } else {
            drawW = heightPx * imgAspect;
            drawX = (widthPx - drawW) / 2;
          }
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
        }
        ctx.restore();
        resolve();
      };
      img.onerror = () => resolve();
      img.src = src;
    });
  }

  /**
   * Helper to draw rounded rectangle paths
   */
  private static roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
  ) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
