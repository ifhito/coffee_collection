variable "aws_region" {
  type        = string
  description = "AWS region (e.g., ap-northeast-1)"
}

variable "project" {
  type        = string
  description = "Project name prefix"
  default     = "bedrock-rag-coffee"
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.20.10.0/24", "10.20.11.0/24"]
}

variable "allowlist_cidr" {
  type        = string
  description = "CIDR allowed to access RDS (POC). Use your IP/32."
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "db_name" {
  type    = string
  default = "coffee_rag"
}

variable "db_username" {
  type    = string
  default = "postgres"
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "bedrock_generation_model_id" {
  type        = string
  description = "Claude model id"
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "bedrock_embedding_model_id" {
  type        = string
  description = "Titan embedding model id"
  default     = "amazon.titan-embed-text-v1"
}

variable "logs_bucket_name" {
  type        = string
  description = "S3 bucket for Bedrock invocation logs"
  default     = null
}

variable "bedrock_generation_inference_profile_arn" {
  type        = string
  description = "Inference profile ARN for generation model (optional)"
  default     = null
}

variable "bedrock_embedding_inference_profile_arn" {
  type        = string
  description = "Inference profile ARN for embedding model (optional)"
  default     = null
}
