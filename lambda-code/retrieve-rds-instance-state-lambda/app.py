import logging
import boto3

#Logging
LOGGER = logging.getLogger()
LOGGER.setLevel(logging.INFO)

#Initialise Boto3 for RDS
rdsClient = boto3.client('rds')


def handler(event, context):
    """ Retrieve status of rds cluster """
    #log input event
    LOGGER.info(event)
    
    rdsClusterId = event['rdsClusterId']
    rds_data = rdsClient.describe_db_clusters(DBClusterIdentifier=rdsClusterId)
    cluster_status = rds_data['DBClusters'][0]['Status']
    if cluster_status == 'stopped':
        """ The cluster is stopped """
        return {
            'statusCode': 200,
            'rdsClusterStatus': cluster_status,
            'rdsClusterId': rdsClusterId,
            'readyToStop': 'no'
        }
    elif cluster_status == 'available':
        """ Cluster is started, check instance status either """
        instance_ids = [x['DBInstanceIdentifier'] for x in rds_data['DBClusters'][0]['DBClusterMembers']]

        for id in instance_ids:
            instance = rdsClient.describe_db_instances(DBInstanceIdentifier=id)
            instance_state = instance['DBInstances'][0]['DBInstanceStatus']
            if instance_state == 'available':
                continue
            else:
                return {
                    'statusCode': 200,
                    'rdsClusterStatus': cluster_status,
                    'rdsClusterId': rdsClusterId,
                    'readyToStop': 'no'
                }
        
        return {
            'statusCode': 200,
            'rdsClusterStatus': cluster_status,
            'rdsClusterId': rdsClusterId,
            'readyToStop': 'yes'
        }
    else:
        """ Cluster is stopping """
        return {
            'statusCode': 200,
            'rdsClusterStatus': cluster_status,
            'rdsClusterId': rdsClusterId,
            'readyToStop': 'no'
        }