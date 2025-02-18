'use client';

import jsPDF from "jspdf";

// pdf-txt-generator.ts
interface PDFGeneratorOptions {
    margin?: number;
    pageWidth?: number;
    pageHeight?: number;
    isEnglish: boolean;
    onProgress?: (progress: number) => void;
    title?: string;
}

export const generateTextPDF = async (
    elements: HTMLElement[],
    options: PDFGeneratorOptions
) => {
    const {
        margin = 20,
        pageWidth = 595,
        pageHeight = 842,
        title = 'Document'
    } = options;

    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2);

    const findEmptySpaceForQuestion = (element: HTMLElement, maxHeight: number): number => {
        const container = document.createElement('div');
        container.style.cssText = `
            position: absolute;
            width: ${contentWidth}px;
            visibility: hidden;
            pointer-events: none;
        `;
        document.body.appendChild(container);
        
        const clone = element.cloneNode(true) as HTMLElement;
        container.appendChild(clone);

        const textNodes: {node: Text, top: number, height: number}[] = [];
        const walkTextNodes = (node: Node, acc: typeof textNodes) => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
                const range = document.createRange();
                range.selectNode(node);
                const rect = range.getBoundingClientRect();
                acc.push({
                    node: node as Text,
                    top: rect.top,
                    height: rect.height
                });
            }
            node.childNodes.forEach(child => walkTextNodes(child, acc));
        };
        walkTextNodes(clone, textNodes);

        const lineHeight = parseInt(window.getComputedStyle(clone).lineHeight || '20');
        let candidateBreakPoint = 0;

        textNodes.sort((a, b) => a.top - b.top);
        
        for (let i = 0; i < textNodes.length - 1; i++) {
            const current = textNodes[i];
            const next = textNodes[i + 1];
            const gap = next.top - (current.top + current.height);

            if (gap >= lineHeight * 2) {
                const breakPoint = current.top + current.height + (gap / 2);
                if (breakPoint <= maxHeight) {
                    candidateBreakPoint = breakPoint;
                }
            }
        }

        container.remove();
        return candidateBreakPoint || maxHeight;
    };

    const createPDFContent = async () => {
        let currentPage = document.createElement('div');
        let pageContents: string[] = [];
        let currentY = margin;

        // 제목 페이지 생성
        if (title) {
            const titleElement = document.createElement('h1');
            titleElement.textContent = title;
            titleElement.style.textAlign = 'center';
            titleElement.style.marginTop = '20pt';
            currentPage.appendChild(titleElement);
            currentY += 60;
        }

        for (const element of elements) {
            const elementHeight = element.getBoundingClientRect().height;
            const availableHeight = contentHeight - (currentY - margin);

            if (elementHeight > availableHeight) {
                const breakPoint = findEmptySpaceForQuestion(element, availableHeight);
                
                if (breakPoint > 0) {
                    // 현재 페이지에 들어갈 부분 생성
                    const upperContainer = document.createElement('div');
                    upperContainer.style.height = `${breakPoint}px`;
                    upperContainer.style.overflow = 'hidden';
                    const elementClone = element.cloneNode(true) as HTMLElement;
                    upperContainer.appendChild(elementClone);
                    currentPage.appendChild(upperContainer);

                    // 현재 페이지 저장
                    pageContents.push(currentPage.outerHTML);

                    // 새 페이지 준비
                    currentPage = document.createElement('div');
                    currentY = margin;

                    // 남은 부분을 새 페이지에 추가
                    const lowerContainer = document.createElement('div');
                    lowerContainer.style.marginTop = `-${breakPoint}px`;
                    const elementClone2 = element.cloneNode(true) as HTMLElement;
                    lowerContainer.appendChild(elementClone2);
                    currentPage.appendChild(lowerContainer);
                    currentY += elementHeight - breakPoint;
                }
            } else {
                // 요소가 현재 페이지에 들어갈 수 있는 경우
                const elementClone = element.cloneNode(true) as HTMLElement;
                currentPage.appendChild(elementClone);
                currentY += elementHeight + 20;
            }

            // 현재 페이지가 가득 찼거나 마지막 요소인 경우
            if (currentY > contentHeight || element === elements[elements.length - 1]) {
                pageContents.push(currentPage.outerHTML);
                currentPage = document.createElement('div');
                currentY = margin;
            }

            options.onProgress?.(Math.round((elements.indexOf(element) + 1) / elements.length * 100));
        }

        return pageContents;
    };

    // 페이지 콘텐츠 생성
    const pageContents = await createPDFContent();

    // API 호출하여 PDF 생성
    const response = await fetch('/api/util', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            pages: pageContents,
            margin,
            pageWidth,
            pageHeight
        })
    });

    if (!response.ok) {
        throw new Error('PDF generation failed');
    }

    // const blob = await response.blob();
      // PDF 데이터를 받아서 jsPDF 인스턴스 생성
      const pdfBuffer = await response.arrayBuffer();
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const pdf = new jsPDF();
      pdf.loadFile(url);
      URL.revokeObjectURL(url);
      return pdf;
};