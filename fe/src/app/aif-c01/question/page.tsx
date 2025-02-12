'use client'
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ExternalLink } from 'lucide-react';
import { AIFNavigation } from '@/components/aif-navigation';
import { decrypt } from '@/lib/crypto';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom';

interface Comment {
    user: string;
    selected_answer: string;
    content: string;
    upvotes: number;
}

interface Question {
    category: string;
    number: string;
    data_id: string;
    url: string;
    question: string;
    choices: string[];
    answer: string;
    comments: Comment[];
}

declare global {
  interface Window {
    __INITIAL_QUESTIONS__: string;
  }
}

const ExamPage = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
    const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
    const [isEnglish, setIsEnglish] = useState(true);
    const [questionsPerPage, setQuestionsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [isPrintMode, setIsPrintMode] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [pdfProgress, setPdfProgress] = useState(0);
    const questionRefs = useRef<Record<string, HTMLDivElement>>({});

    useEffect(() => {
        const loadQuestions = async () => {
            try {
                const encryptedData = window.__INITIAL_QUESTIONS__;
                const data = JSON.parse(decrypt(encryptedData));
                setQuestions(isEnglish ? data.questions_en : data.questions_ko);
            } catch (error) {
                console.error('Error loading questions:', error);
            }
        };

        loadQuestions();
    }, [isEnglish]);

    useEffect(() => {
        if (isPrintMode) {
            setQuestionsPerPage(200);
            setCurrentPage(1);
        }
    }, [isPrintMode]);

    const handleAnswerSelect = (questionNumber: string, answer: string) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [questionNumber]: answer
        }));
    };

    const toggleShowAnswer = (questionNumber: string) => {
        setShowAnswers(prev => ({
            ...prev,
            [questionNumber]: !prev[questionNumber]
        }));
    };

    const getCurrentPageQuestions = () => {
        const startIndex = (currentPage - 1) * questionsPerPage;
        const endIndex = startIndex + questionsPerPage;
        return questions.slice(startIndex, endIndex);
    };

    const totalPages = Math.ceil(questions.length / questionsPerPage);

    const handleDownloadPDF = async () => {
        try {
            setIsGeneratingPDF(true);
            setPdfProgress(0);

            // print:hidden 항목 숨기기
            const printHiddenElements = document.querySelectorAll('.print\\:hidden');
            printHiddenElements.forEach(el => {
                (el as HTMLElement).style.display = 'none';
            });

            const margin = 20;
            const pageWidth = 595;
            const pageHeight = 842;
            const contentWidth = pageWidth - (margin * 2);
            const contentHeight = pageHeight - (margin * 2);
            const canvasScale = 2;

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
            let processedQuestions = 0;
            const pdf = new jsPDF('p', 'pt', 'a4', true);

            const currentQuestions = getCurrentPageQuestions();
            
            for (const question of currentQuestions) {
                const questionElement = questionRefs.current[question.number];
                if (!questionElement) continue;

                const questionCanvas = await html2canvas(questionElement, {
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

                processedQuestions++;
                setPdfProgress(Math.round(processedQuestions / currentQuestions.length * 100));
            }

            // 마지막 페이지 처리
            if (currentY > 0) {
                const imgData = mainCanvas.toDataURL('image/jpeg', 1.0);
                // 마지막 페이지도 contentWidth와 contentHeight 비율 유지
                const pageRatio = contentWidth / contentHeight;
                const currentRatio = contentWidth / currentY;
                
                if (currentRatio > pageRatio) {
                    // 너비에 맞춤
                    pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentWidth / pageRatio);
                } else {
                    // 높이에 맞춤
                    pdf.addImage(imgData, 'JPEG', margin, margin, currentY * pageRatio, currentY);
                }
            }

            // PDF 저장
            pdf.save(`questions-${isEnglish ? 'en' : 'ko'}.pdf`);

            // PDF 저장 후 print:hidden 항목 복원
            printHiddenElements.forEach(el => {
                (el as HTMLElement).style.display = '';
            });

        } catch (error) {
            console.error('PDF 생성 중 오류 발생:', error);
        } finally {
            setIsGeneratingPDF(false);
            setPdfProgress(0);
        }
    };

    // 문제 렌더링 함수 (별도 구현 필요)
    const renderQuestion = (question: Question) => {
        const div = document.createElement('div');
        // 문제 내용을 HTML로 구성
        div.innerHTML = `
            <div class="mb-4">
                <h2 class="text-xl font-bold mb-2">
                    ${isEnglish ? 'Question' : '문제'} ${question.number}
                </h2>
                <p class="text-gray-800 mb-4">${question.question}</p>
                <!-- 나머지 문제 내용 구성 -->
            </div>
        `;
        return div;
    };

    // 텍스트 라인을 찾는 헬퍼 함수
    const findTextLines = (element: HTMLElement) => {
        const lines: { height: number; text: string }[] = [];
        const walk = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null
        );

        let node;
        while (node = walk.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(node);
            const rects = range.getClientRects();
            
            for (let i = 0; i < rects.length; i++) {
                const rect = rects[i];
                lines.push({
                    height: rect.height,
                    text: node.textContent?.substring(i * 50, (i + 1) * 50) || '' // 대략적인 라인 길이
                });
            }
        }

        return lines;
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="fixed top-0 left-0 right-0 bg-white z-10 border-b print:hidden">
                <AIFNavigation />
                <div className="container mx-auto p-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4">
                            <Label htmlFor="questions-per-page" className="text-sm">
                                {isEnglish ? 'Questions per page' : '페이지당 문제 수'}:
                            </Label>
                            <select
                                id="questions-per-page"
                                value={questionsPerPage}
                                onChange={(e) => {
                                    setQuestionsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="border rounded p-1"
                                // disabled={isPrintMode}
                            >
                                {[1, 5, 10, 30, 50, 200].map((num) => (
                                    <option key={num} value={num}>
                                        {num}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Label htmlFor="language-toggle" className="text-sm">
                                {isEnglish ? 'English' : '한글'}
                            </Label>
                            <Switch
                                id="language-toggle"
                                checked={isEnglish}
                                onCheckedChange={setIsEnglish}
                            />
                            <Label htmlFor="print-mode-toggle" className="text-sm ml-4">
                                {isEnglish ? 'View Mode' : '보기모드'}: {isPrintMode ? (isEnglish ? 'Print' : '인쇄') : (isEnglish ? 'Solve' : '풀기')}
                            </Label>
                            <Switch
                                id="print-mode-toggle"
                                checked={isPrintMode}
                                onCheckedChange={setIsPrintMode}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <main className="p-8">
                <div id="print-content" className="container mx-auto p-4 mt-32 print:mt-0">
                    {getCurrentPageQuestions().map((q: Question) => (
                        <Card 
                            key={q.number} 
                            className="mb-8 question-card" 
                            ref={(el) => {
                                if (el) questionRefs.current[q.number] = el;
                            }}
                        >
                            <CardContent className="p-6">
                                <div className="mb-4">
                                    <h2 className="text-xl font-bold mb-2">
                                        {isEnglish ? 'Question' : '문제'} {q.number}
                                    </h2>
                                    <p className="text-gray-800 mb-4">{q.question}</p>

                                    <div className="space-y-3">
                                        {q.choices.map((choice, idx) => {
                                            const isAnswer = choice[0].toLowerCase() === q.answer.toLowerCase();
                                            const isSelected = selectedAnswers[q.number] === choice[0].toLowerCase();
                                            const isWrongSelection = showAnswers[q.number] && 
                                                selectedAnswers[q.number] && 
                                                selectedAnswers[q.number] !== q.answer.toLowerCase();
                                            
                                            return (
                                                <div key={idx} className="flex items-center space-x-2">
                                                    {!isPrintMode ? (
                                                        <input
                                                            type="radio"
                                                            id={`q${q.number}-${idx}`}
                                                            name={`question-${q.number}`}
                                                            value={choice[0].toLowerCase()}
                                                            checked={isSelected}
                                                            onChange={() => handleAnswerSelect(q.number, choice[0].toLowerCase())}
                                                            className="w-4 h-4"
                                                        />
                                                    ) : (
                                                        <span className="w-4 h-4 flex items-center justify-center">•</span>
                                                    )}
                                                    <label 
                                                        htmlFor={`q${q.number}-${idx}`} 
                                                        className={`
                                                            text-gray-700
                                                            ${(showAnswers[q.number] || isPrintMode) && isSelected && isAnswer ? 'bg-green-100' : ''}
                                                            ${(showAnswers[q.number] || isPrintMode) && isAnswer && isWrongSelection ? 'bg-red-100' : ''}
                                                            font-semibold px-2 py-1 rounded
                                                        `}
                                                    >
                                                        {choice}
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-4">
                                        {!isPrintMode && (
                                            <Button
                                                onClick={() => toggleShowAnswer(q.number)}
                                                variant="outline"
                                                className="mr-2"
                                            >
                                                {showAnswers[q.number]
                                                    ? (isEnglish ? 'Hide Answer' : '답안 숨기기')
                                                    : (isEnglish ? 'Show Answer' : '답안 확인')}
                                            </Button>
                                        )}

                                        <a
                                            href={q.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-blue-600 hover:text-blue-800 print:hidden"
                                        >
                                            <ExternalLink size={16} className="ml-1" />
                                        </a>
                                    </div>

                                    {(showAnswers[q.number] || isPrintMode) && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                            <p className="font-bold text-green-600 mb-2">
                                                {isEnglish ? 'Answer' : '정답'}: {q.answer.toUpperCase()}
                                            </p>
                                            {!isPrintMode && (
                                                <div className="space-y-2">
                                                    <h3 className="font-semibold">
                                                        {isEnglish ? 'Comments' : '댓글'}:
                                                    </h3>
                                                    {q.comments.map((comment, idx) => (
                                                        <div key={idx} className="p-2 bg-white rounded border">
                                                            <p className="text-sm text-gray-600 mb-1">
                                                                {comment.user} - {isEnglish ? 'Selected' : '선택'}: {comment.selected_answer}
                                                            </p>
                                                            <p className="text-gray-800">{comment.content}</p>
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                {isEnglish ? 'Upvotes' : '추천'}: {comment.upvotes}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    <div className="flex justify-center items-center space-x-2 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1 || isGeneratingPDF}
                            className="print:hidden"
                        >
                            {isEnglish ? 'Previous' : '이전'}
                        </Button>
                        <span className="mx-4 print:hidden">
                            {currentPage} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages || isGeneratingPDF}
                            className="print:hidden"
                        >
                            {isEnglish ? 'Next' : '다음'}
                        </Button>
                        <Button
                            variant="default"
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPDF}
                            className="ml-4 print:hidden relative min-w-[140px]"
                        >
                            {isGeneratingPDF ? (
                                <>
                                    <div className="absolute left-0 top-0 h-full bg-primary/20" style={{ width: `${pdfProgress}%` }} />
                                    <span className="relative z-10">
                                        {isEnglish ? `Generating ${pdfProgress}%` : `생성중 ${pdfProgress}%`}
                                    </span>
                                </>
                            ) : (
                                isEnglish ? 'Download PDF' : 'PDF 다운로드'
                            )}
                        </Button>
                    </div>
                </div>
            </main>
            {isGeneratingPDF && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
                        <p className="text-lg font-semibold">
                            {isEnglish ? 'Generating PDF...' : 'PDF 생성중...'}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            {pdfProgress}%
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamPage;