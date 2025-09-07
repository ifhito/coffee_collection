import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from './config.js';

const client = new BedrockRuntimeClient({ region: config.aws.region });

export async function embedText(text: string): Promise<number[]> {
  const body = JSON.stringify({ inputText: text });
  const cmd = new InvokeModelCommand({
    modelId: config.aws.embeddingModel,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  });
  const res = await client.send(cmd);
  const json = JSON.parse(new TextDecoder().decode(res.body));
  if (!json.embedding) throw new Error('No embedding in response');
  return json.embedding as number[];
}

export async function generateWithClaude(
  system: string,
  userText: string,
  maxTokens = 800,
): Promise<string> {
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    system: [{ type: 'text', text: system }],
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: userText }],
      },
    ],
  });

  const cmd = new InvokeModelCommand({
    modelId: config.aws.generationModel,
    contentType: 'application/json',
    accept: 'application/json',
    body,
  });
  const res = await client.send(cmd);
  const json = JSON.parse(new TextDecoder().decode(res.body));
  // Anthropic returns {content:[{type:'text',text:'...'}],stop_reason,...}
  const content = json?.content?.[0]?.text ?? '';
  return content;
}
