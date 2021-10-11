import logging
import boto3

#Logging
LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

#Initialise Boto3 for RDS
rdsClient = boto3.client('rds')


def handler(event, context):
    
    #log input event
    LOGGER.info(event)
    
    rdsClusterId = event['rdsClusterId']
    
    #Stop RDS instance
    LOGGER.info(f"Stopping {rdsClusterId}")
    rdsClient.stop_db_cluster(DBClusterIdentifier=rdsClusterId)
    
    return {
        'statusCode': 200,
        'rdsClusterId': rdsClusterId
    }
