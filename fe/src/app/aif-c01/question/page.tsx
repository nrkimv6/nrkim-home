'use client'
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ExternalLink } from 'lucide-react';
import { AIFNavigation } from '@/components/aif-navigation';

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

const ExamPage = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
    const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
    const [isEnglish, setIsEnglish] = useState(true);
    const [questionsPerPage, setQuestionsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const loadQuestions = async () => {
            try {
                const lang = isEnglish ? 'en' : 'ko';
                const response = await fetch(`/data/aif-c01/questions_${lang}.json`);
                const data = await response.json();
                setQuestions(data);
            } catch (error) {
                console.error('Error loading questions:', error);
            }
        };

        loadQuestions();
    }, [isEnglish]);

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

    return (
        <div className="min-h-screen bg-background">
            <div className="fixed top-0 left-0 right-0 bg-white z-10 border-b">
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
                        </div>
                    </div>
                </div>
            </div>
            <main className="p-8">
                <div className="container mx-auto p-4 mt-32">
                    {getCurrentPageQuestions().map((q: Question) => (
                        <Card key={q.number} className="mb-8">
                            <CardContent className="p-6">
                                <div className="mb-4">
                                    <h2 className="text-xl font-bold mb-2">
                                        {isEnglish ? 'Question' : '문제'} {q.number}
                                    </h2>
                                    <p className="text-gray-800 mb-4">{q.question}</p>

                                    <div className="space-y-3">
                                        {q.choices.map((choice, idx) => {
                                            const isAnswer = showAnswers[q.number] && 
                                                choice[0].toLowerCase() === q.answer.toLowerCase();
                                            
                                            return (
                                                <div key={idx} className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        id={`q${q.number}-${idx}`}
                                                        name={`question-${q.number}`}
                                                        value={choice[0].toLowerCase()}
                                                        checked={selectedAnswers[q.number] === choice[0].toLowerCase()}
                                                        onChange={() => handleAnswerSelect(q.number, choice[0].toLowerCase())}
                                                        className="w-4 h-4"
                                                    />
                                                    <label 
                                                        htmlFor={`q${q.number}-${idx}`} 
                                                        className={`
                                                            text-gray-700
                                                            ${isAnswer ? 'bg-green-100 font-semibold px-2 py-1 rounded' : ''}
                                                        `}
                                                    >
                                                        {choice}
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-4">
                                        <Button
                                            onClick={() => toggleShowAnswer(q.number)}
                                            variant="outline"
                                            className="mr-2"
                                        >
                                            {showAnswers[q.number]
                                                ? (isEnglish ? 'Hide Answer' : '답안 숨기기')
                                                : (isEnglish ? 'Show Answer' : '답안 확인')}
                                        </Button>

                                        <a
                                            href={q.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center text-blue-600 hover:text-blue-800"
                                        >
                                            <ExternalLink size={16} className="ml-1" />
                                        </a>
                                    </div>

                                    {showAnswers[q.number] && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                            <p className="font-bold text-green-600 mb-2">
                                                {isEnglish ? 'Answer' : '정답'}: {q.answer.toUpperCase()}
                                            </p>
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
                            disabled={currentPage === 1}
                        >
                            {isEnglish ? 'Previous' : '이전'}
                        </Button>
                        <span className="mx-4">
                            {currentPage} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            {isEnglish ? 'Next' : '다음'}
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ExamPage;