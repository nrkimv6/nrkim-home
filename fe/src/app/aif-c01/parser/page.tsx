'use client'
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Save } from 'lucide-react';
import { debug } from "@/lib/utils"

interface SavedData {
    id: string;
    timeBuffer: string;
    subtitleInput: string;
    summaryInput: string;
    fileNameBase: string;
    timestamp: number;
}

export default function ParserApp() {
    const [timeBuffer, setTimeBuffer] = useState('00:00:00.000');
    const [subtitleInput, setSubtitleInput] = useState('');
    const [summaryInput, setSummaryInput] = useState('');
    const [fileNameBase, setFileNameBase] = useState('');
    const [error, setError] = useState('');
    const [savedList, setSavedList] = useState<SavedData[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('parserData');
                if (saved) {
                    setSavedList(JSON.parse(saved));
                }
            } catch (e) {
                console.error('localStorage 접근 중 에러 발생:', e);
            }
        }
    }, []);

    const validateTimeFormat = (time: string) => {
        const regex = /^([0-1][0-9]|14|15):([0-5][0-9]):([0-5][0-9])\.(\d{3})$/;
        if (!regex.test(time)) {
            setError('Invalid time format. Use HH:MM:SS.mmm (max 15:00:00.000)');
            return false;
        }
        setError('');
        return true;
    };

    const handleTimeBufferChange = (e: { target: { value: any; }; }) => {
        const value = e.target.value;
        setTimeBuffer(value);
        validateTimeFormat(value);
    };

    const handleSaveToStorage = () => {
        const newData: SavedData = {
            id: Date.now().toString(),
            timeBuffer,
            subtitleInput,
            summaryInput,
            fileNameBase,
            timestamp: Date.now()
        };

        const updatedList = [...savedList, newData];
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('parserData', JSON.stringify(updatedList));
                setSavedList(updatedList);
            } catch (e) {
                console.error('localStorage 저장 중 에러 발생:', e);
            }
        }
    };

    const handleLoad = (data: SavedData) => {
        setTimeBuffer(data.timeBuffer);
        setSubtitleInput(data.subtitleInput);
        setSummaryInput(data.summaryInput);
        setFileNameBase(data.fileNameBase);
    };

    const handleDelete = (id: string) => {
        const updatedList = savedList.filter(item => item.id !== id);
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('parserData', JSON.stringify(updatedList));
                setSavedList(updatedList);
            } catch (e) {
                console.error('localStorage 삭제 중 에러 발생:', e);
            }
        }
    };

    const handleReset = () => {
        setTimeBuffer('00:00:00.000');
        setSubtitleInput('');
        setSummaryInput('');
        setFileNameBase('');
        setError('');
    };

    const parseTime = (timeStr: string) => {
        const [time, ms] = timeStr.split('.');
        const [hours, minutes, seconds] = time.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds + (parseInt(ms || '0') / 1000);
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
    };
    const parseSubtitles = (input: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(input, 'text/html');
        const groupedSentences = Array.from(doc.querySelectorAll('.grouped-sentence'));
        const buffer = parseTime(timeBuffer);

        return groupedSentences.map((group, groupIndex) => {
            const sentences = Array.from(group.querySelectorAll('.eachChunk'));
            const groupTimeStampValue = group.querySelector('.timestamp')?.textContent?.trim() || '00:00:00';
            const groupTimestamp = parseTime(groupTimeStampValue) + buffer;

            const sentenceDetails = sentences.map((sentence, index) => {
                const sequence = sentence.querySelector('.sentence-number')?.textContent;
                const timestamp = sentence.querySelector('[data-tooltip-content]')?.getAttribute('data-tooltip-content');
                const text = sentence.textContent?.replace(/^\d+/, '').trim();
                const startTime = parseTime(timestamp || groupTimeStampValue) + buffer;
                const endTime = index < sentences.length - 1
                    ? parseTime(sentences[index + 1].querySelector('[data-tooltip-content]')?.getAttribute('data-tooltip-content') || '00:00:00') + buffer
                    : startTime + 5;

                return {
                    id: index + 1,
                    sequence: parseInt(sequence || '0') || index + 1,
                    startTime: formatTime(startTime),
                    endTime: formatTime(endTime),
                    text
                };
            });

            return {
                id: groupIndex + 1,
                // timestamp: groupTimestamp.replace(/[^\d:]/g, ''),
                timestamp: formatTime(groupTimestamp),
                items: sentenceDetails
            };
        });
    };

    const getDurationInMinutes = (timestamp: string) => {
        const match = timestamp.match(/\((\d+)분\)/);
        return match ? parseInt(match[1]) : 0;
    };
    const formatTimeRange = (timestamp: string) => {
        const timeStr = timestamp.split(' ')[0] || '00:00:00';
        const durationMinutes = getDurationInMinutes(timestamp);

        const startTime = `${timeStr}.000`;
        const endSeconds = parseTime(timeStr) + (durationMinutes * 60);
        const endTime = formatTime(endSeconds);

        return { startTime, endTime };
    };

    const parseSummaries = (input: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(input, 'text/html');
        const sections = Array.from(doc.querySelectorAll('.node-lilysSection'));
        const buffer = parseTime(timeBuffer);

        return sections
            .filter(section => section.querySelector('.node-listItem'))
            .map((section, groupIndex) => {
                const headingEl = section.querySelector('.lilys-heading[class*="h"]');
                let title = headingEl?.querySelector('div')?.textContent?.trim() || '';
                if (title === '') {
                    const h3El = section.querySelector('h3, .sumNodeContent > div');
                    title = h3El?.querySelector('div')?.textContent?.trim() || '';
                }
                const timestamp = section.querySelector('.timestampString')?.textContent || '00:00:00';
                const { startTime, endTime } = formatTimeRange(timestamp);
                debug(`startTime: ${startTime}, endTime: ${endTime}`);
                const startTimeValue = parseTime(startTime) + buffer;
                const endTimeValue = parseTime(endTime) + buffer;
                debug(`startTimeValue: ${startTimeValue}, endTimeValue: ${endTimeValue}`);

                // Get items with HTML content converted to markdown
                const items = Array.from(section.querySelectorAll('.node-listItem')).map((item, itemIndex) => {
                    const contentDiv = item.querySelector('.lilys-list-item-content div');
                    let content = '';

                    if (contentDiv) {
                        const contentClone = contentDiv.cloneNode(true) as HTMLElement;
                        // Remove script-source elements first
                        contentClone.querySelectorAll('script-source').forEach(el => el.remove());
                        // Convert annotated-keywords to markdown bold
                        contentClone.querySelectorAll('annotated-keyword').forEach(el => {
                            const keyword = el.getAttribute('keyword');
                            el.replaceWith(`**${keyword}**`);
                        });
                        content = contentClone.textContent?.trim() || '';
                    }

                    const shortcut = item.querySelector('.script-source')?.textContent?.trim() || '';

                    return {
                        id: itemIndex + 1,
                        content,
                        shortcut
                    };
                });

                // Remove duplicates while preserving order
                const seen = new Set();
                const uniqueItems = items.filter(item => {
                    const key = `${item.content}|${item.shortcut}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                return {
                    id: groupIndex + 1,
                    title,
                    startTime: formatTime(startTimeValue),
                    endTime: formatTime(endTimeValue),
                    items: uniqueItems
                };
            });
    };

    const handleGenerate = () => {
        if (!validateTimeFormat(timeBuffer)) return;

        const subtitles = parseSubtitles(subtitleInput);
        const summaries = parseSummaries(summaryInput);

        const subtitlesBlob = new Blob(
            [JSON.stringify(subtitles, null, 2)],
            { type: 'application/json' }
        );
        const summariesBlob = new Blob(
            [JSON.stringify(summaries, null, 2)],
            { type: 'application/json' }
        );

        const subtitlesURL = URL.createObjectURL(subtitlesBlob);
        const summariesURL = URL.createObjectURL(summariesBlob);

        const subtitlesLink = document.createElement('a');
        subtitlesLink.href = subtitlesURL;
        subtitlesLink.download = `subtitles_${fileNameBase}.json`;
        subtitlesLink.click();

        const summariesLink = document.createElement('a');
        summariesLink.href = summariesURL;
        summariesLink.download = `summaries_${fileNameBase}.json`;
        summariesLink.click();
    };

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <Card>
                <CardContent className="p-6 space-y-4">
                    {/* 저장된 데이터 목록 */}
                    {savedList.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Saved Data</h3>
                            <div className="space-y-2">
                                {savedList.map((data) => (
                                    <div key={data.id} className="flex items-center justify-between p-2 border rounded">
                                        <button
                                            onClick={() => handleLoad(data)}
                                            className="flex-1 text-left hover:bg-gray-100 p-2 rounded"
                                        >
                                            {data.fileNameBase || 'Unnamed'} - {new Date(data.timestamp).toLocaleString()}
                                        </button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(data.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 기존 입력 필드들 */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium">Time Buffer (HH:MM:SS.mmm)</label>
                        <Input
                            value={timeBuffer}
                            onChange={handleTimeBufferChange}
                            placeholder="00:00:00.000"
                            className={error ? 'border-red-500' : ''}
                        />
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium">File Name Base</label>
                        <Input
                            value={fileNameBase}
                            onChange={(e) => setFileNameBase(e.target.value)}
                            placeholder="Enter base file name"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium">Subtitles Input</label>
                        <Textarea
                            value={subtitleInput}
                            onChange={(e) => setSubtitleInput(e.target.value)}
                            placeholder="Paste subtitles HTML here"
                            className="h-48"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium">Summaries Input</label>
                        <Textarea
                            value={summaryInput}
                            onChange={(e) => setSummaryInput(e.target.value)}
                            placeholder="Paste summaries HTML here"
                            className="h-48"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleGenerate} className="flex-1">
                            Generate JSON Files
                        </Button>
                        <Button onClick={handleSaveToStorage} variant="outline">
                            <Save className="h-4 w-4 mr-2" />
                            Save
                        </Button>
                        <Button onClick={handleReset} variant="outline">
                            Reset
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}