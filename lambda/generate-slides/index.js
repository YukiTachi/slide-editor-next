const { Anthropic } = require('@anthropic-ai/sdk');

// 設定定数
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS || '8192', 10);
const MAX_THEME_LENGTH = 200;
const MAX_CONTENT_LENGTH = 5000;
const MAX_CHAPTERS = 20;
const MAX_CHAPTER_LENGTH = 100;

// 既存テンプレート構造の例（簡略版）
const TEMPLATE_EXAMPLE = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>A4横向きスライド</title>
    <link rel="stylesheet" href="css/slide-styles.css">
</head>
<body>
    <div class="slide">
        <h1 class="slide-title">タイトル</h1>
        <h2 class="slide-subtitle">サブタイトル</h2>
        <ul class="slide-list">
            <li class="slide-list-item">項目1</li>
        </ul>
        <div class="footer">PAGE_NUMBER_PLACEHOLDER</div>
    </div>
</body>
</html>`;

// 入力バリデーション
function validateInput(theme, content, chapters) {
  if (!theme || typeof theme !== 'string' || theme.trim().length === 0) {
    return { valid: false, error: 'テーマは必須です' };
  }
  if (theme.length > MAX_THEME_LENGTH) {
    return { valid: false, error: `テーマは${MAX_THEME_LENGTH}文字以内で入力してください` };
  }
  
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { valid: false, error: '内容は必須です' };
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return { valid: false, error: `内容は${MAX_CONTENT_LENGTH}文字以内で入力してください` };
  }
  
  if (!Array.isArray(chapters)) {
    return { valid: false, error: '章立ては配列形式で入力してください' };
  }
  if (chapters.length > MAX_CHAPTERS) {
    return { valid: false, error: `章立ては${MAX_CHAPTERS}個以内で入力してください` };
  }
  for (const chapter of chapters) {
    if (typeof chapter !== 'string' || chapter.length > MAX_CHAPTER_LENGTH) {
      return { valid: false, error: `各章は${MAX_CHAPTER_LENGTH}文字以内で入力してください` };
    }
  }
  
  return { valid: true };
}

// Markdownコードブロックマーカーを除去
function extractHTMLFromMarkdown(text) {
  // ```html ... ``` または ``` ... ``` のパターンを検出
  const codeBlockRegex = /```(?:html)?\s*\n?([\s\S]*?)\n?```/g;
  const matches = text.match(codeBlockRegex);
  
  if (matches && matches.length > 0) {
    // コードブロックが見つかった場合、最初のコードブロックの内容を抽出
    const firstMatch = matches[0];
    const extracted = firstMatch.replace(/```(?:html)?\s*\n?/, '').replace(/\n?```$/, '');
    return extracted.trim();
  }
  
  // コードブロックが見つからない場合、そのまま返す
  return text.trim();
}

exports.handler = async (event) => {
  try {
    // CORS対応
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    // OPTIONSリクエスト（CORS preflight）の処理
    if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    // API Key認証（HTTP APIではLambda関数内で検証）
    const expectedApiKey = process.env.API_GATEWAY_KEY;
    if (expectedApiKey) {
      // HTTP APIとREST APIでヘッダーの取得方法が異なる
      const apiKey = event.headers?.['x-api-key'] || 
                     event.headers?.['X-Api-Key'] ||
                     event.requestContext?.authorizer?.lambda?.['x-api-key'];
      
      if (apiKey !== expectedApiKey) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Forbidden: Invalid API Key' }),
        };
      }
    }

    // 許可オリジン（ホスト）のチェック（ALLOWED_ORIGINS が設定されている場合のみ）
    const allowedOriginsStr = process.env.ALLOWED_ORIGINS;
    if (allowedOriginsStr && allowedOriginsStr.trim()) {
      const allowedOrigins = allowedOriginsStr.split(',').map(s => s.trim()).filter(Boolean);
      const origin = event.headers?.['origin'] || event.headers?.['Origin'];
      const referer = event.headers?.['referer'] || event.headers?.['Referer'];
      let requestOrigin = origin;
      if (!requestOrigin && referer) {
        try {
          requestOrigin = new URL(referer).origin;
        } catch (_) {
          requestOrigin = null;
        }
      }
      const allowed = requestOrigin && allowedOrigins.some(allowed => {
        if (allowed.endsWith('*')) {
          const prefix = allowed.slice(0, -1);
          return requestOrigin === prefix || requestOrigin.startsWith(prefix);
        }
        return requestOrigin === allowed;
      });
      if (!allowed) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Forbidden: Origin not allowed' }),
        };
      }
    }

    // リクエストボディのパース（HTTP APIとREST APIで形式が異なる）
    let requestBody;
    try {
      const body = event.body || (event.requestContext?.http?.method ? event.body : '{}');
      requestBody = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    const { theme, content, chapters = [] } = requestBody;

    // 入力バリデーション
    const validation = validateInput(theme, content, chapters);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: validation.error }),
      };
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }),
      };
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // プロンプト構築
    const prompt = `以下の情報を基に、スライドのHTMLを生成してください。

テーマ: ${theme}
内容: ${content}
章立て: ${chapters.join(', ')}

既存のスライドテンプレート構造に準拠してください：
${TEMPLATE_EXAMPLE}

各スライドは<div class="slide">で囲み、適切なクラス名（slide-title, slide-subtitle, slide-listなど）を使用してください。
ページ番号プレースホルダー（PAGE_NUMBER_PLACEHOLDER）を含めてください。
完全なHTMLドキュメント構造（<!DOCTYPE html>, <head>, <body>など）を含めてください。
HTMLコードのみを返してください。説明文やコードブロックマーカーは含めないでください。`;

    const message = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    let generatedHTML = '';
    if (message.content && message.content[0] && message.content[0].type === 'text') {
      generatedHTML = message.content[0].text;
    }

    // Markdownコードブロックマーカーを除去
    generatedHTML = extractHTMLFromMarkdown(generatedHTML);

    // ページ番号処理はフロントエンド側で行うため、ここではPAGE_NUMBER_PLACEHOLDERをそのまま返す

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ html: generatedHTML }),
    };
  } catch (error) {
    console.error('Error generating slides:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: error.message || 'Unknown error',
      }),
    };
  }
};
