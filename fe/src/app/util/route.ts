// app/api/generate-pdf/route.ts
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(request: Request) {
    try {
        const { pages, options } = await request.json();
        const { margin, pageWidth, pageHeight, title, isEnglish } = options;

        const browser = await puppeteer.launch({
            headless: 'new'
        });
        const page = await browser.newPage();
        await page.setViewport({
            width: pageWidth,
            height: pageHeight
        });

        // Create PDF for each page
        const pdfBuffers: Buffer[] = [];
        
        for (let i = 0; i < pages.length; i++) {
            const { html, styles } = pages[i];
            const content = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            margin: 0;
                            padding: ${margin}px;
                            width: ${pageWidth}px;
                            box-sizing: border-box;
                            -webkit-print-color-adjust: exact;
                        }
                        ${styles}
                    </style>
                </head>
                <body>
                    ${html}
                </body>
                </html>
            `;

            await page.setContent(content, {
                waitUntil: 'networkidle0'
            });

            const pdf = await page.pdf({
                width: pageWidth,
                height: pageHeight,
                printBackground: true,
                margin: {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0
                }
            });

            pdfBuffers.push(pdf);
        }

        await browser.close();

        // Return the merged PDF
        return new NextResponse(Buffer.concat(pdfBuffers), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=questions-${isEnglish ? 'en' : 'ko'}.pdf`
            }
        });

    } catch (error) {
        console.error('PDF generation error:', error);
        return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
    }
};