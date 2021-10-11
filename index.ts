import * as aws from "@pulumi/aws";
import { state_machine_handler } from "./stepFunc";
import { rds_cluster } from "./rds";


const sns_rds_event = new aws.sns.Topic('SnsRdsEvent', {
    displayName: 'sns-rds-event',
    name: 'sns-rds-event',
    tags: {
        'Name': 'sns-rds-event',
        'stack': 'plumi-sns'
    }
});

const rds_event_sub = new aws.rds.EventSubscription('RdsEventSub', {
    enabled: true,
    name: 'rds-event-sub',
    eventCategories: ['notification'],
    sourceType: 'db-cluster',
    sourceIds: [rds_cluster.id],
    snsTopic: sns_rds_event.arn,
    tags: {
        'Name': 'rds-event-sub',
        'stack': 'pulumi-event'
    }
});

const sns_sub = new aws.sns.TopicSubscription('sns-topic-event-sub', {
    endpoint: state_machine_handler.arn,
    protocol: 'lambda',
    topic: sns_rds_event.arn
});

sns_rds_event.onEvent('sns-lambda-trigger', state_machine_handler, sns_sub)
