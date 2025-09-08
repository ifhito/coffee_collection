resource "aws_security_group" "db" {
  name        = "${var.project}-db-sg"
  description = "Allow Postgres from allowlist"
  vpc_id      = aws_vpc.this.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "PostgreSQL"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.allowlist_cidr]
  }

  tags = { Name = "${var.project}-db-sg" }
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-subnet-group"
  subnet_ids = [for s in aws_subnet.public : s.id]
  tags       = { Name = "${var.project}-db-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  identifier             = "${var.project}-postgres"
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = var.db_instance_class
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  publicly_accessible    = true
  multi_az               = false
  storage_encrypted      = true
  skip_final_snapshot    = true
  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.this.name
  apply_immediately      = true

  tags = { Name = "${var.project}-postgres" }
}

