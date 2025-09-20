output "api_invoke_url" {
  value       = aws_apigatewayv2_api.http.api_endpoint
  description = "HTTP API base URL"
}

output "invoke_route" {
  value       = "/invoke"
  description = "Route for Lambda proxy"
}

output "logs_bucket" {
  value       = local.logs_bucket_name
  description = "Bedrock invocation logs bucket"
}
