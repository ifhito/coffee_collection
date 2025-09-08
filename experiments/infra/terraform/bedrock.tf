resource "aws_s3_bucket" "bedrock_logs" {
  count  = var.logs_bucket_name == null ? 1 : 0
  bucket = "${var.project}-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.name}-bedrock-logs"
}

locals {
  logs_bucket_name = coalesce(
    var.logs_bucket_name,
    try(aws_s3_bucket.bedrock_logs[0].bucket, null)
  )
}

resource "aws_bedrock_model_invocation_logging_configuration" "this" {
  logging_config {
    s3_config {
      bucket_name = local.logs_bucket_name
      key_prefix  = "invocations/"
    }
    text_data_delivery_enabled      = true
    image_data_delivery_enabled     = false
    embedding_data_delivery_enabled = true
  }
}
