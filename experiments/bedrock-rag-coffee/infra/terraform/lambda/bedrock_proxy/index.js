'use strict';

const AWS = require('aws-sdk');
const bedrock = new AWS.BedrockRuntime({ region: process.env.AWS_REGION });

async function embed(text) {
  const body = JSON.stringify({ inputText: text });
  const params = {
    modelId: process.env.EMBEDDING_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  };
  const res = await bedrock.invokeModel(params).promise();
  const json = JSON.parse(Buffer.from(res.body).toString('utf8'));
  return json.embedding;
}

async function generate(system, userText, maxTokens) {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    system,
    max_tokens: maxTokens || 800,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: userText }],
      },
    ],
  });
  const params = {
    modelId: process.env.GENERATION_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  };
  const res = await bedrock.invokeModel(params).promise();
  const json = JSON.parse(Buffer.from(res.body).toString('utf8'));
  const content = (json && json.content && json.content[0] && json.content[0].text) || '';
  return content;
}

exports.handler = async (event) => {
  try {
    const body = event.isBase64Encoded
      ? JSON.parse(Buffer.from(event.body, 'base64').toString('utf8'))
      : JSON.parse(event.body || '{}');
    const action = body.action || 'generate';

    if (action === 'embed') {
      if (!body.text) throw new Error('text required');
      const embedding = await embed(body.text);
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ embedding }),
      };
    }

    if (action === 'generate') {
      if (!body.userText) throw new Error('userText required');
      const system = body.system || 'You are a helpful assistant.';
      const text = await generate(system, body.userText, body.maxTokens);
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      };
    }

    return { statusCode: 400, body: 'Unsupported action' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Error' };
  }
};

