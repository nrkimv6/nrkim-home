import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFGeneratorOptions {
    margin?: number;
    pageWidth?: number;
    pageHeight?: number;
    canvasScale?: number;
    isEnglish: boolean;
    onProgress?: (progress: number) => void;
    title?: string;
}

export const generatePDF = async (
    elements: HTMLElement[],
    options: PDFGeneratorOptions
) => {
    const {
        margin = 20,
        pageWidth = 595,
        pageHeight = 842,
        canvasScale = 4,
        isEnglish,
        onProgress,
        title = isEnglish ? 'AWS Certified Solutions Architect Questions' : 'AWS 공인 솔루션스 아키텍트 문제'
    } = options;

    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2);
    let pageCount = 1;

    const debugArea = (y: number, height: number = 100, contentWidth: number, canvasScale: number, cutHeight: number) => {
        console.log('\n[디버그] 그려진 영역 확인');
        // console.log('좌표:', { y, currentY, cutY, cutHeight });
        // 이미지 출력
        const debugCanvas = document.createElement('canvas');
        const debugCtx = debugCanvas.getContext('2d')!;
        debugCanvas.width = contentWidth * canvasScale;
        debugCanvas.height = cutHeight * canvasScale;

        // mainCanvas에서 현재 그려진 영역 복사
        debugCtx.drawImage(
            mainCanvas,
            margin * canvasScale, currentY * canvasScale,
            contentWidth * canvasScale, cutHeight * canvasScale,
            0, 0,
            contentWidth * canvasScale, cutHeight * canvasScale
        );

        const base64 = debugCanvas.toDataURL('image/png');
        console.log('그려진 영역:');
        console.log(`%c `, `
        font-size: 1px;
        height: ${cutHeight * canvasScale}px;
        padding: ${cutHeight * canvasScale / 2}px ${contentWidth * canvasScale / 2}px;
        background: url(${base64}) no-repeat;
        /*background-size: contain;*/
        background-size: 30%; 
    `);
    };

    
    const debugRemaining = (remainingCanvas: HTMLCanvasElement, remainingHeight: number, scale: number, canvasScale: number) => {
        return ;

        console.log('\n[디버그] 남은 영역 확인');
        console.log('크기 정보:', {
            remainingHeight,
            canvasHeight: remainingCanvas.height / canvasScale,
            scale,
            canvasScale,
            scaledRemainingHeight: remainingHeight * canvasScale
        });

        const base64 = remainingCanvas.toDataURL('image/png');
        console.log('남은 영역:');
        console.log(`%c `, `
            font-size: 1px;
            height: ${remainingHeight * canvasScale}px;
            padding: ${remainingHeight * canvasScale / 2}px ${contentWidth * canvasScale / 2}px;
            background: url(${base64}) no-repeat;
            background-size: 30%; 
            display: block; 
            border: 1px solid red;
        `);
    };

    /// 굉장히 이상하게 동작함. TODO 분석 및 확인 필요.
    /// 근데 결과는 꽤 괜찮음

    const findEmptySpaceForQuestion = (
        questionCanvas: HTMLCanvasElement,
        maxHeight: number,
        canvasMaxHeight:number
    ) => {
        const lineHeight = 3;
        const ctx = questionCanvas.getContext('2d')!;

        // 입력받은 maxHeight를 questionCanvas 기준 픽셀로 변환
        // const canvasMaxHeight = Math.floor(maxHeight * canvasScale / scale);

        console.log(`\n[검사 범위] 0~${canvasMaxHeight}, 캔버스높이: ${questionCanvas.height}`);

        const debugLine = (y: number, imageData: ImageData, hasNonWhitePixel: boolean, darkPixelGroups: number, nonWhitePixelCount: number) => {
            return ;
            const debugCanvas = document.createElement('canvas');
            const debugCtx = debugCanvas.getContext('2d')!;

            // 검사하는 라인의 위아래 10픽셀을 포함하여 보여줌
            const debugHeight = 21;
            debugCanvas.width = questionCanvas.width;
            debugCanvas.height = debugHeight;

            // 배경을 흰색으로 칠함
            debugCtx.fillStyle = '#ffffff';
            debugCtx.fillRect(0, 0, debugCanvas.width, debugHeight);

            // 실제 검사 위치를 중심으로 위아래 10픽셀을 그림
            const startY = Math.max(0, y - 10);
            const sourceHeight = Math.min(debugHeight, questionCanvas.height - startY);
            debugCtx.drawImage(
                questionCanvas,
                0, startY,
                questionCanvas.width, sourceHeight,
                0, Math.max(0, 10 - (y - startY)),
                questionCanvas.width, sourceHeight
            );

            // 검사한 실제 라인을 빨간색으로 표시
            const lineY = 10;
            const lineData = debugCtx.getImageData(0, lineY, debugCanvas.width, 1);
            for (let x = 0; x < lineData.data.length; x += 4) {
                if (imageData.data[x + 3] > 0) {  // 원본 픽셀이 투명하지 않은 경우
                    lineData.data[x] = Math.min(255, imageData.data[x] + 100);  // R을 강조
                    lineData.data[x + 1] = imageData.data[x + 1];  // G
                    lineData.data[x + 2] = imageData.data[x + 2];  // B
                    lineData.data[x + 3] = 255;  // 완전 불투명
                }
            }
            debugCtx.putImageData(lineData, 0, lineY);

            const base64 = debugCanvas.toDataURL('image/png');
            console.log(`[라인 디버그] 검사위치: ${y}`);
            console.log(`검사 결과: hasNonWhitePixel=${hasNonWhitePixel}, darkPixelGroups=${darkPixelGroups}, nonWhitePixelCount=${nonWhitePixelCount}`);
            console.log(`%c `, `
                font-size: 1px;
                height: ${debugHeight}px;
                padding: ${debugHeight / 2}px ${questionCanvas.width / 2}px;
                background: url(${base64}) no-repeat;
                background-size: contain;
                border: 1px solid #ccc;
            `);
        };

        let emptyLineCount = 0;
        let firstEmptyY = -1;
        let lastTextY = -1;

        // 아래에서 위로 검사 (캔버스 좌표계 사용)
        for (let y = canvasMaxHeight; y >= 0; y--) {
            let hasNonWhitePixel = false;
            
            try {
                const imageData = ctx.getImageData(
                    0,
                    y,
                    questionCanvas.width,
                    1
                );

                let nonWhitePixelCount = 0;
                let darkPixelGroups = 0;
                let lastWasWhite = true;
                let consecutiveDarkPixels = 0;

                for (let x = 0; x < imageData.data.length; x += 4) {
                    const r = imageData.data[x];
                    const g = imageData.data[x + 1];
                    const b = imageData.data[x + 2];
                    const a = imageData.data[x + 3];

                    const isDarkPixel = (r < 200 || g < 200 || b < 200) && a > 50;
                    
                    if (isDarkPixel) {
                        nonWhitePixelCount++;
                        consecutiveDarkPixels++;
                        if (lastWasWhite && consecutiveDarkPixels >= 2) {
                            darkPixelGroups++;
                            lastWasWhite = false;
                        }
                    } else {
                        consecutiveDarkPixels = 0;
                        lastWasWhite = true;
                    }
                }

                hasNonWhitePixel = darkPixelGroups >= 3 && nonWhitePixelCount > 5;

                if (hasNonWhitePixel || firstEmptyY === -1 || emptyLineCount === lineHeight) {
                    debugLine(y, imageData, hasNonWhitePixel, darkPixelGroups, nonWhitePixelCount);
                }
                if (!hasNonWhitePixel || y === canvasMaxHeight) {
                    debugLine(y, imageData, hasNonWhitePixel, darkPixelGroups, nonWhitePixelCount);
                }

            } catch (error) {
                console.error('이미지 데이터 검사 중 오류:', error);
                continue;
            }

            if (!hasNonWhitePixel) {
                if (firstEmptyY === -1) {
                    firstEmptyY = y;
                }
                emptyLineCount++;
                
                if (emptyLineCount >= lineHeight) {
                    const breakPoint = firstEmptyY + (emptyLineCount / 2);
                    console.log(`[페이지 나누기 결정] breakPoint=${breakPoint}, lastTextY=${lastTextY}`);
                    return breakPoint;
                }
            } else {
                lastTextY = y;
                emptyLineCount = 0;
                firstEmptyY = -1;
            }
        }

        if (emptyLineCount >= lineHeight) {
            const breakPoint = firstEmptyY + (emptyLineCount / 2);
            console.log(`[페이지 나누기 결정] breakPoint=${breakPoint}, lastTextY=${lastTextY}`);
            return breakPoint;
        }
        console.log(`[페이지 나누기 실패] breakPoint=${0}, lastTextY=${lastTextY}`);

        return 0;
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

    // 제목을 위한 여백 추가
    currentY += 50;

    const addPageNumber = (pageNum: number) => {
        pdf.setFont('times', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);  // RGB 값으로 검은색 설정
        const pageText = `-${pageNum}-`;
        const pageTextWidth = pdf.getStringUnitWidth(pageText) * 10;
        const pageTextX = (pageWidth - pageTextWidth) / 2;
        pdf.text(pageText, pageTextX, pageHeight - 10);
    };

    for (const element of elements) {
        const questionCanvas = await html2canvas(element, {
            scale: canvasScale,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            imageTimeout: 0
        });

        const scale = Math.min(contentWidth / (questionCanvas.width / canvasScale), 1);
        const scaledWidth = (questionCanvas.width / canvasScale) * scale;
        const scaledHeight = (questionCanvas.height / canvasScale) * scale;
        console.debug(`processing ${processedElements + 1} scale=${scale}, scaledWidth=${scaledWidth}, scaledHeight=${scaledHeight}, sum=${currentY + scaledHeight}, contentHeight=${contentHeight}`);

        if (currentY + scaledHeight > contentHeight) {
            const xOffset = (contentWidth - scaledWidth) / 2;
            const availableHeight = contentHeight - currentY;

            // 원본 캔버스에서 직접 잘라낼 위치를 찾음
            const cutHeightQuestion = findEmptySpaceForQuestion(
                questionCanvas,
                availableHeight,
                Math.floor(availableHeight * canvasScale / scale)
            );
            const cutHeight = cutHeightQuestion * scale / canvasScale;

            // 첫 페이지에 들어갈 부분 그리기
            mainCtx.drawImage(
                questionCanvas,
                0, 0,
                questionCanvas.width, cutHeightQuestion,
                xOffset, currentY,
                scaledWidth, cutHeight
            );

            // 현재 페이지 추가
            const imgData = mainCanvas.toDataURL('image/png', 1.0);
            pdf.addImage(
                imgData,
                'PNG',
                margin,
                margin,
                contentWidth,
                currentY + cutHeight,
                '',
                'FAST'
            );

            // 첫 페이지인 경우 제목 추가
            if (pageCount === 1) {
                pdf.setFont('times', 'bold');
                pdf.setFontSize(16);
                pdf.setTextColor(0, 0, 0);
                const titleWidth = pdf.getStringUnitWidth(title) * 16;
                const titleX = (pageWidth - titleWidth) / 2;
                pdf.text(title, titleX, margin + 20);
                addPageNumber(pageCount);
            }

            // 페이지 번호 추가

            pdf.addPage();
            pageCount++;
            addPageNumber(pageCount);

            // 넘치는 부분을 위한 임시 캔버스 준비
            const remainingCanvas = document.createElement('canvas');
            const remainingCtx = remainingCanvas.getContext('2d')!;
            remainingCanvas.width = mainCanvas.width;
            remainingCanvas.height = mainCanvas.height;
            remainingCtx.scale(canvasScale, canvasScale);  // 스케일 적용
            remainingCtx.fillStyle = '#ffffff';
            remainingCtx.fillRect(0, 0, remainingCanvas.width / canvasScale, remainingCanvas.height / canvasScale);

            // 남은 부분의 높이 계산
            const remainingHeight = scaledHeight - cutHeight;

            // 넘치는 부분 그리기
            remainingCtx.drawImage(
                questionCanvas,
                0,
                Math.floor((cutHeight / scale) * canvasScale),  // 원본에서의 시작 위치
                questionCanvas.width,
                Math.floor((remainingHeight / scale) * canvasScale),  // 원본에서의 높이
                xOffset,  // margin을 직접 더해줌
                0,  // margin을 직접 더해줌
                scaledWidth,
                remainingHeight
            );

            debugRemaining(remainingCanvas, remainingHeight, scale, canvasScale);
            // 메인 캔버스 초기화 후 임시 캔버스 내용 복사
            mainCtx.fillStyle = '#ffffff';
            mainCtx.fillRect(-margin, -margin, mainCanvas.width / canvasScale, mainCanvas.height / canvasScale);
            mainCtx.drawImage(
                remainingCanvas,
                0, 0,
                mainCanvas.width, mainCanvas.height,
                0, 0,
                mainCanvas.width / canvasScale, mainCanvas.height / canvasScale
            );

            // currentY를 남은 내용의 높이 + 여백으로 설정
            currentY = remainingHeight + margin;
        } else {
            // 페이지를 넘기지 않는 경우 현재 위치에 그리기
            console.debug(`processing ${processedElements + 1} draw all`);

            // 첫 페이지이자 마지막 페이지인 경우 제목 추가
            if (pageCount === 1 && processedElements == elements.length - 1) {
                pdf.setFont('times', 'bold');
                pdf.setFontSize(16);
                pdf.setTextColor(0, 0, 0);
                const titleWidth = pdf.getStringUnitWidth(title) * 16;
                const titleX = (pageWidth - titleWidth) / 2;
                pdf.text(title, titleX, margin + 20);
                addPageNumber(pageCount);
            }


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
        const imgData = mainCanvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight, '', 'FAST');
    }

    return pdf;
}; 