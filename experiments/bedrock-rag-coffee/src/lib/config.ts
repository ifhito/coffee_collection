import 'dotenv/config';

export const config = {
  rds: {
    host: process.env.RDS_HOST || 'localhost',
    port: Number(process.env.RDS_PORT || 5432),
    database: process.env.RDS_DB || 'coffee_rag',
    user: process.env.RDS_USER || 'postgres',
    password: process.env.RDS_PASSWORD || 'postgres',
  },
  aws: {
    region: process.env.AWS_REGION || 'ap-northeast-1',
    embeddingModel: process.env.BEDROCK_EMBEDDING_MODEL || 'amazon.titan-embed-text-v1',
    generationModel: process.env.BEDROCK_GENERATION_MODEL || 'anthropic.claude-3-sonnet-20240229-v1:0',
  },
};

