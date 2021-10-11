import * as aws from "@pulumi/aws";

const sel_vpc_sg = new aws.ec2.SecurityGroup("sel_vpc_sg",
    {
        description: "Allows inbound and outbound traffic for all instances in the VPC",
        name: "sel-t-vpc-sec",
        revokeRulesOnDelete: false,
        tags: {
            Name: "sel-t-vpc-sec",
        }
    }, 
    {
        protect: true,
    }
);

export const rds_cluster = new aws.rds.Cluster('SelTestRdsEventSub', {
    //availabilityZones: ['ap-northeast-2a', 'ap-northeast-2c'],
    clusterIdentifier: 'jack-test-rds-sub',
    engine: 'aurora-postgresql',
    masterUsername: 'postgres',
    masterPassword: 'LCj0829#',
    dbSubnetGroupName: 'vc-test',
    databaseName: "mydb",
    skipFinalSnapshot: true,
    vpcSecurityGroupIds: [sel_vpc_sg.id],
    tags: {
        'Name': 'jack-test-rds-sub',
        'stack': 'pulumi-rds',
        'auto-restart-protection': 'yes'
    }
});

export const clusterInstances: aws.rds.ClusterInstance[] = [];

for (const range = {value: 0}; range.value < 1; range.value++) {
    clusterInstances.push(new aws.rds.ClusterInstance(`SelRdsClusterInstance-${range.value}`, {
        identifier: `jack-test-rds-sub-${range.value}`,
        clusterIdentifier: rds_cluster.id,
        instanceClass: aws.rds.InstanceType.T3_Medium,
        engine: 'aurora-postgresql',
        engineVersion: rds_cluster.engineVersion,
        dbSubnetGroupName: 'vc-test',
        tags: {
            'Name': `jack-test-rds-sub-${range.value}`,
            'stack': 'pulumi-rds-instance',
            'auto-restart-protection': 'yes'
        }
    }))
}