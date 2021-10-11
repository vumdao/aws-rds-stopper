import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import * as handler from './handler';


export const stepFunction = new aws.sfn.StateMachine('SfnRdsEvent', {
    name: 'sfn-rds-event',
    roleArn: handler.sfn_role.arn,
    tags: {
        'Name': 'sfn-rds-event',
        'stack': 'pulumi-sfn'
    },
    definition: pulumi.all([handler.retrieve_rds_status_handler.arn, handler.stop_rds_cluster_handler.arn, handler.send_slack_handler.arn])
        .apply(([retrieveArn, stopRdsArn, sendSlackArn]) => {
        return JSON.stringify({
            "Comment": "RdsAutoRestartWorkFlow: Automatically shutting down RDS instance after a forced Auto-Restart",
            "StartAt": "retrieveRdsClustertate",
            "States": {
                "retrieveRdsClustertate": {
                    "Type": "Task",
                    "Resource": retrieveArn,
                    "TimeoutSeconds": 5,
                    "Retry": [
                        {
                        "ErrorEquals": [
                            "Lambda.Unknown",
                            "States.TaskFailed"
                        ],
                        "IntervalSeconds": 3,
                        "MaxAttempts": 2,
                        "BackoffRate": 1.5
                        }
                    ],
                    "Catch": [
                        {
                        "ErrorEquals": [
                            "States.ALL"
                        ],
                        "Next": "fallback"
                        }
                    ],
                    "Next": "isRdsClusterAvailable"
                },
                "isRdsClusterAvailable": {
                    "Type": "Choice",
                    "Choices": [
                        {
                        "Variable": "$.readyToStop",
                        "StringEquals": "yes",
                        "Next": "stopRdsCluster"
                        }
                    ],
                    "Default": "waitFiveMinutes"
                },
                "waitFiveMinutes": {
                    "Type": "Wait",
                    "Seconds": 300,
                    "Next": "retrieveRdsClustertate"
                },
                "stopRdsCluster": {
                    "Type": "Task",
                    "Resource": stopRdsArn,
                    "TimeoutSeconds": 5,
                    "Retry": [
                        {
                        "ErrorEquals": [
                            "States.Timeout"
                        ],
                        "IntervalSeconds": 3,
                        "MaxAttempts": 2,
                        "BackoffRate": 1.5
                        }
                    ],
                    "Catch": [
                        {
                        "ErrorEquals": [
                            "States.ALL"
                        ],
                        "Next": "fallback"
                        }
                    ],
                    "Next": "retrieveRdsClustertateStopping"
                },
                "retrieveRdsClustertateStopping": {
                    "Type": "Task",
                    "Resource": retrieveArn,
                    "TimeoutSeconds": 5,
                    "Retry": [
                        {
                        "ErrorEquals": [
                            "States.Timeout"
                        ],
                        "IntervalSeconds": 3,
                        "MaxAttempts": 2,
                        "BackoffRate": 1.5
                        }
                    ],
                    "Catch": [
                        {
                        "ErrorEquals": [
                            "States.ALL"
                        ],
                        "Next": "fallback"
                        }
                    ],
                    "Next": "isRdsClusterStopped"
                },
                "isRdsClusterStopped": {
                    "Type": "Choice",
                    "Choices": [
                        {
                        "Variable": "$.rdsClusterStatus",
                        "StringEquals": "stopped",
                        "Next": "sendSlack"
                        }
                    ],
                    "Default": "waitFiveMinutesStopping"
                },
                "waitFiveMinutesStopping": {
                    "Type": "Wait",
                    "Seconds": 300,
                    "Next": "retrieveRdsClustertateStopping"
                },
                "sendSlack": {
                    "Type": "Task",
                    "Resource": sendSlackArn,
                    "TimeoutSeconds": 5,
                    "End": true
                },
                "fallback": {
                    "Type": "Task",
                    "Resource": sendSlackArn,
                    "TimeoutSeconds": 5,
                    "End": true
                }
            }
        });
    })
});

export const state_machine_handler = new aws.lambda.Function('RdsSNSEvent', 
    {
        code: new pulumi.asset.FileArchive('lambda-code/start-statemachine-execution-lambda/handler.tar.gz'),
        description: 'Lambda function listen to RDS SNS event topic to trigger step function',
        name: 'start-step-func-rds',
        handler: 'app.handler',
        runtime: aws.lambda.Runtime.Python3d8,
        role: handler.allowRdsClusterRole.arn,
        environment: {
            variables: {
                'STEPFUNCTION_ARN': stepFunction.arn
            }
        },
        tags: {
            'Name': 'start-step-func-rds',
            'stack': 'pulumi-lambda'
        }
    },
    {
        dependsOn: [handler.allowRdsClusterRole]
    }
);