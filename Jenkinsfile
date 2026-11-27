pipeline {
    agent any

    tools {
        maven 'Maven 3.9'
        jdk 'Java 17'
    }

    environment {
        AWS_REGION = 'ap-south-1'
        EKS_CLUSTER_NAME = 'mediconnect-eks'
        K8S_NAMESPACE = 'mediconnect'
        DOCKER_REGISTRY = "${env.ECR_REGISTRY ?: 'YOUR_AWS_ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/mediconnect'}"
        COMMIT_SHA = sh(script: 'git rev-parse --short HEAD || echo latest', returnStdout: true).trim()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Test Java Microservices') {
            steps {
                echo 'Packaging Java Microservices...'
                dir('backend/doctor-service') {
                    sh 'mvn clean package -DskipTests=false -B'
                }
                dir('backend/appointment-service') {
                    sh 'mvn clean package -DskipTests=false -B'
                }
            }
        }

        stage('Build & Push Docker Images') {
            steps {
                script {
                    sh "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${DOCKER_REGISTRY.split('/')[0]}"

                    def services = [
                        [name: 'mysql-db',            ctx: './database'],
                        [name: 'doctor-service',      ctx: './backend/doctor-service'],
                        [name: 'appointment-service', ctx: './backend/appointment-service'],
                        [name: 'frontend-service',    ctx: '.'],
                        [name: 'gateway-service',     ctx: './gateway']
                    ]

                    for (svc in services) {
                        def tagSha = "${DOCKER_REGISTRY}/${svc.name}:${COMMIT_SHA}"
                        def tagLatest = "${DOCKER_REGISTRY}/${svc.name}:latest"
                        sh "docker build -t ${tagSha} -t ${tagLatest} ${svc.ctx}"
                        sh "docker push ${tagSha}"
                        sh "docker push ${tagLatest}"
                    }
                }
            }
        }

        stage('Deploy to AWS EKS') {
            steps {
                script {
                    sh "aws eks update-kubeconfig --region ${AWS_REGION} --name ${EKS_CLUSTER_NAME}"

                    sh "sed -i 's|DOCKER_REGISTRY/mysql-db:latest|${DOCKER_REGISTRY}/mysql-db:${COMMIT_SHA}|g' k8s/02-mysql-statefulset.yaml"
                    sh "sed -i 's|DOCKER_REGISTRY/doctor-service:latest|${DOCKER_REGISTRY}/doctor-service:${COMMIT_SHA}|g' k8s/doctor-service-deployment.yaml"
                    sh "sed -i 's|DOCKER_REGISTRY/appointment-service:latest|${DOCKER_REGISTRY}/appointment-service:${COMMIT_SHA}|g' k8s/appointment-service-deployment.yaml"
                    sh "sed -i 's|DOCKER_REGISTRY/frontend-service:latest|${DOCKER_REGISTRY}/frontend-service:${COMMIT_SHA}|g' k8s/frontend-deployment.yaml"
                    sh "sed -i 's|DOCKER_REGISTRY/gateway-service:latest|${DOCKER_REGISTRY}/gateway-service:${COMMIT_SHA}|g' k8s/gateway-deployment.yaml"

                    sh "kubectl apply -f k8s/00-namespace.yaml"
                    sh "kubectl apply -f k8s/01-config-secret.yaml"
                    sh "kubectl apply -f k8s/02-mysql-statefulset.yaml"
                    sh "kubectl apply -f k8s/03-redis.yaml"
                    sh "kubectl rollout status statefulset/mysql-db -n ${K8S_NAMESPACE} --timeout=300s"
                    sh "kubectl apply -f k8s/"
                    sh "kubectl rollout status deployment/doctor-service-deployment -n ${K8S_NAMESPACE} --timeout=300s"
                    sh "kubectl rollout status deployment/appointment-service-deployment -n ${K8S_NAMESPACE} --timeout=300s"
                    sh "kubectl rollout status deployment/frontend-deployment -n ${K8S_NAMESPACE} --timeout=300s"
                    sh "kubectl rollout status deployment/gateway-deployment -n ${K8S_NAMESPACE} --timeout=300s"
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'MediConnect Pro deployed cleanly to AWS EKS!'
        }
        failure {
            echo 'Deployment failed. Check kubectl describe pod and pod logs in namespace mediconnect.'
        }
    }
}
