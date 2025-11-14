locals {
  name_prefix = "ds2-${var.environment}"
}

# Data source for existing ECS cluster
data "aws_ecs_cluster" "main" {
  cluster_name = var.ecs_cluster_name
}

# Data source for existing IAM roles (created by backend)
data "aws_iam_role" "ecs_execution" {
  name = "${local.name_prefix}-ecs-execution-role"
}

data "aws_iam_role" "ecs_task" {
  name = "${local.name_prefix}-ecs-task-role"
}

# Data source for ECR repository
data "aws_ecr_repository" "frontend" {
  name = "${local.name_prefix}-frontend"
}

# CloudWatch Log Group for Frontend
resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/aws/ecs/${local.name_prefix}-frontend"
  retention_in_days = 14

  tags = {
    Name        = "${local.name_prefix}-frontend-logs"
    Environment = var.environment
  }
}

# ECS Task Definition for Frontend
resource "aws_ecs_task_definition" "frontend" {
  family                = "${local.name_prefix}-frontend"
  network_mode          = "bridge"
  execution_role_arn    = data.aws_iam_role.ecs_execution.arn
  task_role_arn         = data.aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${data.aws_ecr_repository.frontend.repository_url}:${var.image_tag}"
      essential = true
      memory    = 512

      portMappings = [{
        containerPort = 3003
        hostPort      = 3003
        protocol      = "tcp"
      }]

      environment = [
        {
          name  = "REACT_APP_ENV"
          value = var.react_app_env
        },
        {
          name  = "REACT_APP_API_PROD_ENDPOINT"
          value = var.react_app_api_endpoint
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Name        = "${local.name_prefix}-frontend-task"
    Environment = var.environment
  }
}

# ECS Service for Frontend
resource "aws_ecs_service" "frontend" {
  name            = "${local.name_prefix}-frontend-service"
  cluster         = data.aws_ecs_cluster.main.arn
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1

  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  capacity_provider_strategy {
    capacity_provider = "${local.name_prefix}-capacity-provider"
    weight            = 1
    base              = 0
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  tags = {
    Name        = "${local.name_prefix}-frontend-service"
    Environment = var.environment
  }
}

# CloudWatch Alarm for Frontend Memory
resource "aws_cloudwatch_metric_alarm" "frontend_memory_high" {
  alarm_name          = "${local.name_prefix}-frontend-memory-high"
  alarm_description   = "Alert when frontend memory usage is high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  dimensions = {
    ClusterName = data.aws_ecs_cluster.main.cluster_name
    ServiceName = aws_ecs_service.frontend.name
  }

  tags = {
    Name        = "${local.name_prefix}-frontend-memory-alarm"
    Environment = var.environment
  }
}
