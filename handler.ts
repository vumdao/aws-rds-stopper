import * as aws from '@pulumi/aws';
import * as pulumi from "@pulumi/pulumi";
import { rds_cluster, clusterInstances } from "./rds";


export const allowRdsClusterRole = new aws.iam.Role("allow-stop-rds-cluster-role", {
    name: 'lambda-stop-rds-cluster',
    description: 'Role to stop rds cluster base on event',
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Sid: "",
            Principal: {
                Service: "lambda.amazonaws.com",
            },
        }],
    }),
    tags: {
        'Name': 'lambda-stop-rds-cluster',
        'stack': 'pulumi-iam'
    },
});

const rds_policy = new aws.iam.RolePolicy("allow-stop-rds-cluster", {
    role: allowRdsClusterRole,
    policy: {
        Version: "2012-10-17",
        Statement: [
            {
                Sid: "AllowRdsStatement",
                Effect: "Allow",
                Resource: "*",
                Action: [
                    "rds:AddTagsToResource",
                    "rds:ListTagsForResource",
                    "rds:DescribeDB*",
                    "rds:StopDB*"
                ]
            },
            {
                Sid: "AllowSfnStatement",
                Effect: "Allow",
                Resource: "*",
                Action: "states:StartExecution"
            },
            {
                Sid: 'AllowLog',
                Effect: 'Allow',
                Resource: "arn:aws:logs:*:*:*",
                Action: [
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents"
                ],
            }
        ]
    },
}, {parent: allowRdsClusterRole});

export const retrieve_rds_status_handler = new aws.lambda.Function('RetrieveRdsStateFunc', {
    code: new pulumi.asset.FileArchive('lambda-code/retrieve-rds-instance-state-lambda/handler.tar.gz'),
    description: 'Lambda function to retrieve rds instance status',
        name: 'get-rds-status',
        handler: 'app.handler',
        runtime: aws.lambda.Runtime.Python3d8,
        role: allowRdsClusterRole.arn,
        tags: {
            'Name': 'get-rds-status',
            'stack': 'pulumi-lambda'
        }
});

export const stop_rds_cluster_handler = new aws.lambda.Function('StopRdsClusterFunc', {
    code: new pulumi.asset.FileArchive('lambda-code/stop-rds-instance-lambda/handler.tar.gz'),
    description: 'Lambda function to retrieve rds instance status',
        name: 'stop-rds-cluster',
        handler: 'app.handler',
        runtime: aws.lambda.Runtime.Python3d8,
        role: allowRdsClusterRole.arn,
        tags: {
            'Name': 'stop-rds-cluster',
            'stack': 'pulumi-lambda'
        }
});

export const send_slack_handler = new aws.lambda.Function('SendSlackFunc', {
    code: new pulumi.asset.FileArchive('lambda-code/send-slack/handler.tar.gz'),
    description: 'Lambda function to send slack',
        name: 'rds-send-slack',
        handler: 'app.handler',
        runtime: aws.lambda.Runtime.Python3d8,
        role: allowRdsClusterRole.arn,
        tags: {
            'Name': 'rds-send-slack',
            'stack': 'pulumi-lambda'
        }
});

export const sfn_role = new aws.iam.Role('SfnRdsRole', {
    name: 'sfn-rds',
    description: 'Role to trigger lambda functions',
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Sid: "",
            Principal: {
                Service: "states.ap-northeast-2.amazonaws.com",
            },
        }],
    }),
    tags: {
        'Name': 'sfn-rds',
        'stack': 'pulumi-iam'
    }
});

const policy = new aws.iam.RolePolicy("allow-invoke-lambda", {
    role: sfn_role,
    name: 'allow-invoke-lambda',
    policy: {
        Version: "2012-10-17",
        Statement: [
            {
                Sid: "AllowRdsStatement",
                Effect: "Allow",
                Resource: [
                    retrieve_rds_status_handler.arn,
                    stop_rds_cluster_handler.arn,
                    send_slack_handler.arn
                ],
                Action: "lambda:InvokeFunction",
            }
        ]
    },
}, {parent: sfn_role});