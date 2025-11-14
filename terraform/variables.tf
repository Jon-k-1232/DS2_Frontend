variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-west-2"
}

variable "environment" {
  type        = string
  description = "Environment name (dev/prod)"
  default     = "prod"
}

variable "ecs_cluster_name" {
  type        = string
  description = "Name of the ECS cluster"
  default     = "ds2-prod-ecs-cluster"
}

variable "ecr_repository_url" {
  type        = string
  description = "ECR repository URL for frontend image"
  default     = "561979538576.dkr.ecr.us-west-2.amazonaws.com/ds2-prod-frontend"
}

variable "image_tag" {
  type        = string
  description = "Docker image tag to deploy"
  default     = "latest"
}

variable "react_app_env" {
  type        = string
  description = "React app environment"
  default     = "production"
}

variable "react_app_api_endpoint" {
  type        = string
  description = "API endpoint for frontend"
  default     = "https://ds2.kimmeloffice.com/ds2_backend"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where resources will be deployed"
  default     = "vpc-04f4c4cf527f99b9a"
}
