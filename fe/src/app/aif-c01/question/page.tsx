'use client'
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ExternalLink } from 'lucide-react';
import { AIFNavigation } from '@/components/aif-navigation';
import { decrypt } from '@/lib/crypto';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
        const content = document.getElementById('print-content');
        if (!content) return;

        try {
            setIsGeneratingPDF(true);
            setPdfProgress(0);

            // 임시로 print:hidden 클래스를 가진 요소들을 숨김
            const printHiddenElements = document.querySelectorAll('.print\\:hidden');
            printHiddenElements.forEach(el => {
                (el as HTMLElement).style.display = 'none';
            });

            // 컨텐츠를 임시로 조정
            const originalStyle = content.style.cssText;
            Object.assign(content.style, {
                position: 'relative',
                width: 'auto',
                height: 'auto',
                margin: '0',
                padding: '20px',
                transform: 'none',
                background: '#ffffff'
            });

            // 스크롤 위치 저장
            const originalScrollPos = window.scrollY;

            // 전체 높이 계산을 위해 임시로 스타일 조정
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'visible';
            window.scrollTo(0, 0);

            // 테두리 스타일 임시 조정
            const cards = content.querySelectorAll('.question-card');
            const originalCardStyles = Array.from(cards).map((card: Element) => {
                const cardElement = card as HTMLElement;
                const style = {
                    border: cardElement.style.border,
                    boxShadow: cardElement.style.boxShadow
                };
                cardElement.style.border = '1px solid #e2e8f0';
                cardElement.style.boxShadow = 'none';
                return style;
            });

            // 전체 컨텐츠를 하나의 캔버스로 캡처
            setPdfProgress(10);

            const pdf = new jsPDF('p', 'mm', 'a4', true);
            const margin = 10;
            const pageWidth = 210 - (margin * 2);
            const pageHeight = 297 - (margin * 2);

            // 모든 문제 카드 요소 선택
            const questionCards = content.querySelectorAll('.question-card');
            const totalQuestions = questionCards.length;
            let currentPage = 0;
            let processedQuestions = 0;

            while (processedQuestions < totalQuestions) {
                // 현재 페이지에 들어갈 문제들을 담을 임시 컨테이너 생성
                const tempContainer = document.createElement('div');
                tempContainer.style.width = content.style.width;
                tempContainer.style.background = '#ffffff';
                tempContainer.style.padding = '20px';
                
                let currentHeight = 0;
                let questionsInCurrentPage = 0;

                // 문제들을 하나씩 추가하면서 높이 체크
                for (let i = processedQuestions; i < totalQuestions; i++) {
                    const card = questionCards[i] as HTMLElement;
                    const cardClone = card.cloneNode(true) as HTMLElement;
                    tempContainer.appendChild(cardClone);

                    // 임시로 body에 추가하여 높이 계산
                    document.body.appendChild(tempContainer);
                    const containerHeight = tempContainer.offsetHeight;
                    document.body.removeChild(tempContainer);

                    // A4 페이지 높이를 mm에서 px로 변환 (대략적인 비율 사용)
                    const maxHeightInPx = pageHeight * 3.779528; // 1mm = 3.779528px

                    if (containerHeight > maxHeightInPx) {
                        if (questionsInCurrentPage === 0) {
                            // 최소한 하나의 문제는 포함
                            questionsInCurrentPage = 1;
                        }
                        // 마지막에 추가된 문제 제거
                        tempContainer.removeChild(cardClone);
                        break;
                    }

                    currentHeight = containerHeight;
                    questionsInCurrentPage++;
                }

                // 현재 페이지의 문제들을 캡처
                document.body.appendChild(tempContainer);
                const canvas = await html2canvas(tempContainer, {
                    scale: 2,
                    useCORS: true,
                    logging: true,
                    backgroundColor: '#ffffff',
                    width: tempContainer.offsetWidth,
                    height: tempContainer.offsetHeight
                });
                document.body.removeChild(tempContainer);

                // 첫 페이지가 아니면 새 페이지 추가
                if (currentPage > 0) {
                    pdf.addPage();
                }

                // PDF에 이미지 추가
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const imgWidth = pageWidth;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                pdf.addImage(
                    imgData,
                    'JPEG',
                    margin,
                    margin,
                    imgWidth,
                    Math.min(imgHeight, pageHeight)
                );

                processedQuestions += questionsInCurrentPage;
                currentPage++;

                setPdfProgress(10 + Math.round(processedQuestions * 80 / totalQuestions));
            }

            setPdfProgress(90);
            pdf.save(`questions-${isEnglish ? 'en' : 'ko'}.pdf`);

            // 원래 스타일 복원
            content.style.cssText = originalStyle;
            cards.forEach((card: Element, index: number) => {
                const cardElement = card as HTMLElement;
                Object.assign(cardElement.style, originalCardStyles[index]);
            });
            window.scrollTo(0, originalScrollPos);
            document.body.style.overflow = originalOverflow;

            // 숨겼던 요소들 복구
            printHiddenElements.forEach(el => {
                (el as HTMLElement).style.removeProperty('display');
            });

        } catch (error) {
            console.error('PDF 생성 중 오류 발생:', error);
        } finally {
            setIsGeneratingPDF(false);
            setPdfProgress(0);
        }
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
                                disabled={isPrintMode}
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
                        <Card key={q.number} className="mb-8 question-card">
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