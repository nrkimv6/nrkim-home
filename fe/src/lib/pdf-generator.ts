import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFGeneratorOptions {
    margin?: number;
    pageWidth?: number;
    pageHeight?: number;
    canvasScale?: number;
    isEnglish: boolean;
    onProgress?: (progress: number) => void;
}

export const generatePDF = async (
    elements: HTMLElement[],
    options: PDFGeneratorOptions
) => {
    const {
        margin = 20,
        pageWidth = 595,
        pageHeight = 842,
        canvasScale = 2,
        isEnglish,
        onProgress
    } = options;

    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2);

    const findEmptySpace = (ctx: CanvasRenderingContext2D, startY: number, endY: number) => {
        const minEmptyLines = 5;     // 텍스트 라인 높이 이하 최소 여백
        const lineHeight = 1;        // 픽셀 단위로 검사
        const threshold = 5;         // 약간의 노이즈 허용

        // 검색 범위 조정 (스케일 적용)
        const searchStartY = Math.min(endY, contentHeight) * canvasScale;
        const searchEndY = Math.max(startY, 0) * canvasScale;
        
        // 아래에서 위로 검색하면서 연속된 빈 라인을 찾음
        let maxEmptyY = searchStartY;
        let currentEmptyLines = 0;
        
        for (let y = searchStartY; y >= searchEndY; y--) {
            const imageData = ctx.getImageData(0, y, ctx.canvas.width, lineHeight);
            const data = imageData.data;
            
            let isEmptyLine = true;
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha > 0) {
                    const avgColor = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    if (avgColor < 250) {
                        isEmptyLine = false;
                        break;
                    }
                }
            }

            if (isEmptyLine) {
                currentEmptyLines++;
                if (currentEmptyLines >= minEmptyLines) {
                    maxEmptyY = y;  // minEmptyLines를 더하지 않음
                    break;
                }
            } else {
                currentEmptyLines = 0;
            }
        }

        // endY를 초과하지 않도록 보정
        const result = Math.min(maxEmptyY / canvasScale, endY);
        console.log(`startY: ${startY}, endY: ${endY}, return: ${result}`);
        return result;
    };

    const mainCanvas = document.createElement('canvas');
    const mainCtx = mainCanvas.getContext('2d')!;
    mainCanvas.width = pageWidth * canvasScale;
    mainCanvas.height = pageHeight * canvasScale;
    mainCtx.scale(canvasScale, canvasScale);
    mainCtx.fillStyle = '#ffffff';
    mainCtx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
    mainCtx.translate(margin, margin);

    let currentY = 0;
    let processedElements = 0;
    const pdf = new jsPDF('p', 'pt', 'a4', true);

    for (const element of elements) {
        const questionCanvas = await html2canvas(element, {
            scale: canvasScale,
            useCORS: true,
            backgroundColor: '#ffffff'
        });

        const scale = Math.min(contentWidth / (questionCanvas.width / canvasScale), 1);
        const scaledWidth = (questionCanvas.width / canvasScale) * scale;
        const scaledHeight = (questionCanvas.height / canvasScale) * scale;

        if (currentY + scaledHeight > contentHeight) {
            const cutY = findEmptySpace(mainCtx, currentY, contentHeight);
            
            const xOffset = (contentWidth - scaledWidth) / 2;
            const cutHeight = cutY - currentY;
            mainCtx.drawImage(
                questionCanvas,
                0, 0,
                questionCanvas.width, (cutHeight / scaledHeight) * questionCanvas.height,
                xOffset, currentY,
                scaledWidth, cutHeight
            );

            // 현재 페이지 추가
            const imgData = mainCanvas.toDataURL('image/jpeg', 1.0);
            pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, cutY);
            pdf.addPage();

            // 넘치는 부분을 위한 임시 캔버스 준비
            const remainingCanvas = document.createElement('canvas');
            const remainingCtx = remainingCanvas.getContext('2d')!;
            remainingCanvas.width = mainCanvas.width;
            remainingCanvas.height = mainCanvas.height;
            remainingCtx.scale(canvasScale, canvasScale);  // 스케일 적용
            remainingCtx.fillStyle = '#ffffff';
            remainingCtx.fillRect(0, 0, remainingCanvas.width / canvasScale, remainingCanvas.height / canvasScale);
            remainingCtx.translate(margin, margin);  // 여백 적용

            // 넘치는 부분 임시 캔버스에 그리기
            const remainingHeight = (currentY + scaledHeight) - cutY;
            remainingCtx.drawImage(
                questionCanvas,
                0, (cutHeight / scaledHeight) * questionCanvas.height,  // 원본에서의 시작 위치
                questionCanvas.width, (remainingHeight / scaledHeight) * questionCanvas.height,  // 원본에서의 높이
                xOffset, 0,  // margin은 translate로 처리했으므로 0으로 설정
                scaledWidth, remainingHeight  // 캔버스에서의 크기
            );

            // 메인 캔버스 초기화 후 임시 캔버스 내용 복사
            mainCtx.fillStyle = '#ffffff';
            mainCtx.fillRect(-margin, -margin, mainCanvas.width / canvasScale, mainCanvas.height / canvasScale);
            mainCtx.drawImage(
                remainingCanvas, 
                0, 0,  // 원본 시작점
                mainCanvas.width, mainCanvas.height,  // 원본 크기
                -margin, -margin,  // 여백 유지
                mainCanvas.width / canvasScale, mainCanvas.height / canvasScale  // 대상 크기
            );

            // currentY를 남은 내용의 높이 + 여백으로 설정
            currentY = remainingHeight + margin;
        } else {
            // 페이지를 넘기지 않는 경우 현재 위치에 그리기
            const xOffset = (contentWidth - scaledWidth) / 2;
            mainCtx.drawImage(
                questionCanvas,
                0, 0,
                questionCanvas.width, questionCanvas.height,
                xOffset, currentY,
                scaledWidth, scaledHeight
            );
            currentY += scaledHeight + 20; // 문제 사이 간격 추가
        }

        processedElements++;
        onProgress?.(Math.round(processedElements / elements.length * 100));
    }

    // 마지막 페이지 처리
    if (currentY > 0) {
        const imgData = mainCanvas.toDataURL('image/jpeg', 1.0);
        // 페이지 비율 유지를 위해 contentHeight 사용
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
    }

    return pdf;
}; 