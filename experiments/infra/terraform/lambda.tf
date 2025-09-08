locals {
  lambda_env = {
    GENERATION_MODEL_ID = var.bedrock_generation_model_id
    EMBEDDING_MODEL_ID  = var.bedrock_embedding_model_id
    # Use try() to allow null -> empty string without coalesce error
    GENERATION_INFERENCE_PROFILE_ARN = try(var.bedrock_generation_inference_profile_arn, "")
    EMBEDDING_INFERENCE_PROFILE_ARN  = try(var.bedrock_embedding_inference_profile_arn, "")
  }
}

data "archive_file" "bedrock_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_py/bedrock_proxy"
  output_path = "${path.module}/lambda_py/bedrock_proxy.zip"
}

resource "aws_lambda_function" "bedrock_proxy" {
  function_name = "${var.project}-bedrock-proxy"
  role          = aws_iam_role.lambda.arn
  runtime       = "python3.12"
  handler       = "lambda_function.handler"
  filename      = data.archive_file.bedrock_lambda_zip.output_path
  # Ensure updates are detected and code is redeployed when zip changes
  source_code_hash = data.archive_file.bedrock_lambda_zip.output_base64sha256
  timeout       = 30
  memory_size   = 512

  environment {
    variables = local.lambda_env
  }
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.bedrock_proxy.function_name}"
  retention_in_days = 14
}
