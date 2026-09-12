// ===================================================
// Gemini AI 코멘트 서버 함수 (Vercel 서버리스)
//
// 이 파일은 /api/gemini 주소로 동작합니다.
// 브라우저에서 직접 Gemini API 키를 쓰면 누구나 볼 수 있어서,
// 키는 여기 서버에만 두고 브라우저는 이 주소로 요청합니다.
//
// Vercel 환경변수 설정 필요:
//   GEMINI_API_KEY = (Google AI Studio에서 발급한 키)
//
// 무료 모델: gemini-2.0-flash (Google AI Studio 무료 티어)
// ===================================================

export default async function handler(req, res) {
  // POST 요청만 허용합니다.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 허용합니다." });
  }

  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "메모 내용(text)이 필요합니다." });
  }

  // API 키를 환경변수에서 꺼냅니다. 코드에 직접 적지 않습니다.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다." });
  }

  // 개인정보 보호: 메모 내용(text)만 보내고 uid·이메일은 보내지 않습니다.
  const prompt =
    "학생이 학급 담벼락에 남긴 메모입니다:\n" +
    "\"" + text + "\"\n\n" +
    "이 메모를 읽은 선생님 입장에서 따뜻하고 건설적인 코멘트를 " +
    "두 문장 이내로 한국어로 작성해 주세요.";

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(502).json({ error: "Gemini API 오류: " + (err.error?.message ?? response.status) });
    }

    const data = await response.json();
    const comment =
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      "코멘트를 생성하지 못했습니다.";

    return res.status(200).json({ comment: comment.trim() });
  } catch (e) {
    return res.status(500).json({ error: "Gemini API 호출 중 오류가 발생했습니다." });
  }
}
