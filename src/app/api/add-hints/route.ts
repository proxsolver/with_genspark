import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
            maxOutputTokens: 50000, // 토큰 제한 대폭 증가 (Gemini 2.5-flash의 thoughts 토큰 포함)
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

    // 응답 구조 검증 (단계별로 확인)
    console.log("Gemini API 응답 전체:", JSON.stringify(data, null, 2));

    if (!data.candidates) {
        console.error("❌ candidates 필드가 없습니다.");
        throw new Error("Gemini API 응답에 candidates 필드가 없습니다.");
    }

    if (data.candidates.length === 0) {
        console.error("❌ candidates 배열이 비어있습니다.");
        throw new Error("Gemini API가 빈 응답을 반환했습니다. 프롬프트가 너무 길거나 안전 필터에 걸렸을 수 있습니다.");
    }

    if (!data.candidates[0].content) {
        console.error("❌ content 필드가 없습니다.");
        throw new Error("Gemini API 응답에 content가 없습니다.");
    }

    if (!data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
        console.error("❌ parts 배열이 없거나 비어있습니다.");
        throw new Error("Gemini API 응답에 parts가 없습니다.");
    }

    if (!data.candidates[0].content.parts[0].text) {
        console.error("❌ text 필드가 없습니다.");
        throw new Error("Gemini API 응답에 text가 없습니다.");
    }

    // 응답에서 JSON 텍스트 추출
    const rawText = data.candidates[0].content.parts[0].text;
    console.log("✅ Gemini 응답 텍스트 추출 성공, 길이:", rawText.length);

    // ```json 마크다운 블록에서 JSON 추출 시도
    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
        return jsonMatch[1];
    }

    // 마크다운 블록이 없거나 불완전한 경우, ```json으로 시작하고 ```로 끝나는지 확인
    let cleanedText = rawText.trim();
    if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\n?/, '');
    }
    if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.replace(/\n?```$/, '');
    }

    return cleanedText;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { grade, subject, fileName } = body;

        if (!grade || !subject || !fileName) {
            return NextResponse.json({
                message: '학년, 과목, 파일명은 필수 항목입니다.'
            }, { status: 400 });
        }

        // 1. 기존 JSON 파일 읽기
        const filePath = path.join(process.cwd(), 'src', 'data', 'questions', `grade${grade}`, subject, fileName);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({
                message: `파일을 찾을 수 없습니다: ${filePath}`
            }, { status: 404 });
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const questionsData = JSON.parse(fileContent);

        // 2. 프롬프트 템플릿 읽기
        const promptTemplatePath = path.join(process.cwd(), 'GEN_QUIZ', 'ADD_HINTS.MD');
        const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf-8');

        // 3. 최종 프롬프트 생성 (JSON 데이터 삽입)
        const finalPrompt = promptTemplate.replace(
            '{{QUESTIONS_JSON}}',
            JSON.stringify(questionsData, null, 2)
        );

        // 4. Gemini API 호출
        console.log(`📝 힌트 생성 시작: ${fileName}`);
        const generatedJsonString = await callGeminiAPI(finalPrompt);

        // 5. 응답 데이터 검증
        let updatedData;
        try {
            console.log("Gemini 응답 길이:", generatedJsonString.length);
            console.log("Gemini 응답 미리보기:", generatedJsonString.substring(0, 200));

            updatedData = JSON.parse(generatedJsonString);

            console.log("파싱된 데이터 타입:", typeof updatedData);
            console.log("배열 여부:", Array.isArray(updatedData));
            console.log("데이터 길이:", Array.isArray(updatedData) ? updatedData.length : 'N/A');

        } catch (e) {
            console.error("JSON 파싱 오류:", e);
            console.error("Gemini가 생성한 원본 텍스트 (처음 500자):", generatedJsonString.substring(0, 500));
            throw new Error("Gemini API가 유효하지 않은 JSON 형식을 반환했습니다. 원본 텍스트를 확인하세요.");
        }

        // 6. 힌트가 추가되었는지 확인
        const hasHints = updatedData.every((q: any) => q.hint);
        if (!hasHints) {
            console.warn("일부 문제에 힌트가 누락되었습니다.");
        }

        // 7. 백업 생성 (원본 보존)
        const backupPath = filePath.replace('.json', '.backup.json');
        fs.copyFileSync(filePath, backupPath);
        console.log(`✅ 백업 생성: ${backupPath}`);

        // 8. 데이터 검증
        if (!Array.isArray(updatedData) || updatedData.length === 0) {
            throw new Error("생성된 데이터가 비어있거나 올바른 배열이 아닙니다.");
        }

        // 9. 새 데이터 저장 (원본 파일 덮어쓰기)
        fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf-8');
        console.log(`✅ 힌트 추가 완료: ${filePath}`);

        // 미리보기용 첫 번째와 마지막 문제 추출
        const preview = {
            first: updatedData.length > 0 ? updatedData[0] : null,
            last: updatedData.length > 1 ? updatedData[updatedData.length - 1] : updatedData[0]
        };

        return NextResponse.json({
            message: '힌트 추가 성공!',
            filePath: `/src/data/questions/grade${grade}/${subject}/${fileName}`,
            backupPath: backupPath,
            hintsAdded: updatedData.length,
            preview: preview
        }, { status: 200 });

    } catch (error: any) {
        console.error('[add-hints API Error]', error);
        return NextResponse.json({
            message: error.message || '서버 내부 오류가 발생했습니다.'
        }, { status: 500 });
    }
}
