import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    return NextResponse.json({ message: "API Route is working!" });
}

// Gemini API를 호출하는 함수
async function callGeminiAPI(prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }],
        generationConfig: {
            temperature: 0.7,
            topK: 1,
            topP: 1,
            maxOutputTokens: 8192,
            stopSequences: [],
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Gemini API 호출 실패: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts[0].text) {
        console.error("Gemini API 응답 데이터 구조 오류:", JSON.stringify(data, null, 2));
        throw new Error("Gemini API로부터 유효한 콘텐츠를 받지 못했습니다.");
    }
    
    // 응답에서 JSON 텍스트 추출
    const rawText = data.candidates[0].content.parts[0].text;
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
        return jsonMatch[1];
    }
    
    // JSON 마크다운이 없는 경우, 순수 텍스트 반환 시도
    return rawText;
}


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { grade, subject, difficulty } = body;

        if (!grade || !subject || !difficulty) {
            return NextResponse.json({ message: '학년, 과목, 난이도는 필수 항목입니다.' }, { status: 400 });
        }

        // 1. 프롬프트 템플릿 읽기
        const promptTemplatePath = path.join(process.cwd(), 'GEN_QUIZ', 'GEN_QUIZ.MD');
        const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf-8');

        // 2. 최종 프롬프트 생성
        const finalPrompt = promptTemplate
            .replace('{{학년}}', grade)
            .replace('{{과목}}', subject)
            .replace('{{난이도}}', difficulty);

        // 3. Gemini API 호출
        const generatedJsonString = await callGeminiAPI(finalPrompt);
        
        // 4. 응답 데이터 검증
        let generatedData;
        try {
            generatedData = JSON.parse(generatedJsonString);
        } catch (e) {
            console.error("JSON 파싱 오류:", e);
            console.error("Gemini가 생성한 원본 텍스트:", generatedJsonString);
            throw new Error("Gemini API가 유효하지 않은 JSON 형식을 반환했습니다.");
        }

        // 5. 다음 파일 이름 결정
        const questionsDir = path.join(process.cwd(), 'src', 'data', 'questions', `grade${grade}`, subject);
        fs.mkdirSync(questionsDir, { recursive: true }); // 디렉토리 존재 확인 및 생성

        const files = fs.readdirSync(questionsDir);
        const levelFiles = files.filter(file => file.startsWith(`level${difficulty}-`) && file.endsWith('.json'));
        
        let nextFileNum = 1;
        if (levelFiles.length > 0) {
            const highestNum = levelFiles.reduce((max, file) => {
                const match = file.match(/level\d+-(\d+)\.json/);
                const num = match ? parseInt(match[1], 10) : 0;
                return num > max ? num : max;
            }, 0);
            nextFileNum = highestNum + 1;
        }

        const newFileName = `level${difficulty}-${nextFileNum}.json`;
        const newFilePath = path.join(questionsDir, newFileName);

        // 6. 새 파일 저장
        fs.writeFileSync(newFilePath, JSON.stringify(generatedData, null, 2), 'utf-8');

        // 미리보기용 첫 번째와 마지막 문제 추출
        const preview = {
            first: generatedData[0] || null,
            last: generatedData[generatedData.length - 1] || null
        };

        return NextResponse.json({
            message: '퀴즈 생성 성공!',
            filePath: `/src/data/questions/grade${grade}/${subject}/${newFileName}`,
            preview: preview,
            totalQuestions: generatedData.length
        }, { status: 201 });

    } catch (error: any) {
        console.error('[generate-quiz API Error]', error);
        return NextResponse.json({ message: error.message || '서버 내부 오류가 발생했습니다.' }, { status: 500 });
    }
}
