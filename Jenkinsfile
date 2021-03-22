@Library('mdblp-library') _
pipeline {
    agent any
    stages {
        stage('Initialization') {
            steps {
                script {
                    utils.initPipeline()
                    if(env.GIT_COMMIT == null) {
                        // git commit id must be a 40 characters length string (lower case or digits)
                        env.GIT_COMMIT = "f".multiply(40)
                    }
                    env.RUN_ID = UUID.randomUUID().toString()
                }
            }
        }
        stage('Build ') {
            agent {
                docker {
                    image "docker.ci.diabeloop.eu/node-build:12"
                }
            }
            steps {
                withCredentials([string(credentialsId: 'nexus-token', variable: 'NEXUS_TOKEN')]) {
                    sh "npm run build-ci"
                    stash name: "test",  includes: "**"
                }
            }
        }
        stage('Test ') {
            steps {
                unstash "test"
                echo 'start mongo to serve as a testing db'
                sh 'docker network create seagulltest${RUN_ID} && docker run --rm -d --net=seagulltest${RUN_ID} --name=mongo4seagulltest${RUN_ID} mongo:4.2'
                script {
                    docker.image("docker.ci.diabeloop.eu/node-build:12").inside("--net=seagulltest${RUN_ID}") {
                        withCredentials([string(credentialsId: 'nexus-token', variable: 'NEXUS_TOKEN')]) {
                            sh "MONGO_CONN_STRING='mongodb://mongo4seagulltest${RUN_ID}:27017/seagull_test' npm run test-ci"
                        }
                    }
                }
            }
            post {
                always {
                    sh 'docker stop mongo4seagulltest${RUN_ID} && docker network rm seagulltest${RUN_ID}'
                    junit 'test-report.xml'
                }
            }
        }
        stage('Package') {
            steps {
                withCredentials([string(credentialsId: 'nexus-token', variable: 'NEXUS_TOKEN')]) {
                    pack()
                }
            }
        }
        stage('Documentation') {
            steps {
                genDocumentation()
            }
        }
        stage('Publish') {
            when { branch "main" }
            steps {
                publish()
            }
        }
    }
}
