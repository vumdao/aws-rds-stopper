import json
import boto3
import logging
import os
import re


#Logging
LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

#Initialise Boto3 for RDS
rdsClient = boto3.client('rds')

def is_restart_protect_enable(rds_id):
    """ Get value of auto-restart-protection key """
    rds_meta = rdsClient.describe_db_clusters(DBClusterIdentifier=rds_id)
    tag_list = rds_meta['DBClusters'][0]['TagList']
    for tag in tag_list:
        if tag['Key'] == 'auto-restart-protection':
            if tag['Value'] == 'yes':
                return True
            else:
                return False
    LOGGER.info("There is no tag 'auto-restart-protection'")
    return False


def handler(event, context):
    """ Catch event of RDS cluster
        - Parsing the event to get RDS cluster identifier and then get its cluster instance identifiers
        - Get RDS cluster TagList to check if `auto-restart-protection` is enabled
        Step function needs to wait for all Cluster instances available in order to stop the RDS
    """
    #log input event
    LOGGER.info("RdsAutoRestart Event Received, now checking if event is eligible. Event Details ==> %s", event)

    #Input
    snsMessage = json.loads(event['Records'][0]['Sns']['Message'])
    rdsClusterId = snsMessage['Source ID']
    rdsEventId = snsMessage['Event ID']
    if 'RDS-EVENT-0151' in rdsEventId:
        if is_restart_protect_enable(rdsClusterId):
            stepFunctionInput = {"rdsClusterId": rdsClusterId}

            #log input event
            LOGGER.info("RdsAutoRestart Event detected, now verifying that instance was tagged with auto-restart-protection == yes")

            #log instance tags
            LOGGER.info("RdsAutoRestart Event detected, now verifying that instance was tagged with auto-restart-protection == yes")

            #Initialise StepFunctions Client
            stepFunctionsClient = boto3.client('stepfunctions')

            # Start StepFunctions WorkFlow
            stepFunctionsArn = os.environ['STEPFUNCTION_ARN']
            stepFunctionsClient.start_execution(
                stateMachineArn= stepFunctionsArn,
                name=event['Records'][0]['Sns']['MessageId'],
                input= json.dumps(stepFunctionInput)
            )
        else:
            LOGGER.info("RdsAutoRestart Event not set or disabled")
    else:
        LOGGER.info("Event is not eligible")

    return {
        'statusCode': 200
    }
